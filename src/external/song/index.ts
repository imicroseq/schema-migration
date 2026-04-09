/*
 * Copyright (c) 2022 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import urlJoin from 'url-join';
import { z as zod } from 'zod';

import Logger, { LogLevel } from '../../logger';
import { Result } from '../../types';
import { safeJsonFetcher, withTimeout } from '../../utils/fetchUtils';
import { asyncPipe } from '../../structures/pipe';
import { filterUndefined } from '../../utils/arrayUtils';
import createEgoClient, { EgoConfigOptions } from '../ego';
import { Analysis, AnalysisState, PagedAnalysisResponse, SongErrorResponse } from './types';
import { failure, success } from '../../types/result';
import { Headers } from 'node-fetch';
import _ from 'lodash';
import { pipeLog } from '../../utils/pipeUtils';

type SongConfigOptions = {
	host: string;
	name?: string;
	ego?: EgoConfigOptions;
};

export type RequestPagination = {
	limit?: number;
	offset?: number;
};

export type AnalysisFilters = {
	study: string;
	states: AnalysisState[];
};

function createSongClient(config: SongConfigOptions) {
	const logger = Logger(...filterUndefined('SongClient', config.name));
	let egoClient = config.ego ? createEgoClient(config.ego) : undefined;

	/* ===== STUDY FETCHING ===== */
	const listStudies = async (): Promise<Result<string[]>> => {
		logger.info(`Fetching all studies from Song...`);

		const StudiesResponse = zod.string().array();

		const allStudiesUrl = urlJoin(config.host, 'studies', 'all');

		return asyncPipe(safeJsonFetcher(allStudiesUrl)).into(StudiesResponse.parse).run();
	};

	/* ===== ANALYSIS FETCHING ===== */
	const getAnalysesPage = async (
		filters: AnalysisFilters,
		page?: RequestPagination,
	): Promise<Result<PagedAnalysisResponse>> => {
		logger.info(`Fetching analyses from Song`, { filters, page });

		const limit = page?.limit ? page.limit : 20;
		const offset = page?.offset ? page.offset : 0;
		const queryParams =
			'?' +
			new URLSearchParams({
				limit: `${limit}`,
				offset: `${offset}`,
				analysisStates: filters.states,
			}).toString();
		const pagedAnalysesUrl = urlJoin(config.host, 'studies', filters.study, 'analysis', 'paginated', queryParams);

		//TODO: Timeout should be configurable
		return asyncPipe(withTimeout(10000, safeJsonFetcher)(pagedAnalysesUrl)).into(PagedAnalysisResponse.parse).run();
	};

	/* ===== ANALYSIS UPDATING ===== */
	const updateAnalysis = async (analysis: Analysis): Promise<Result<Analysis>> => {
		if (!egoClient) {
			logger.error('Unable to send update request', 'no ego application credentials provided');
			return failure('Unable to send update request, no ego application credentials provided.');
		}
		logger.debug(`Sending Analysis Update Request`, analysis.studyId, analysis.analysisId);
		const updateUrl = urlJoin(config.host, 'studies', analysis.studyId, 'analysis', analysis.analysisId);

		const updateBody = _.omit(analysis, [
			'analysisState',
			'analysisId',
			'studyId',
			'createdAt',
			'updatedAt',
			'firstPublishedAt',
			'publishedAt',
			'analysisStateHistory',
			'files',
		]);

		const fetchResult = await withTimeout(5000, egoClient.fetchWithAuth)(updateUrl, {
			method: 'PUT',
			headers: new Headers({ 'Content-Type': 'application/json' }),
			body: JSON.stringify(updateBody),
		});

		if (fetchResult.success) {
			const response = fetchResult.data;

			// Handle the Update Response:
			// return the original analysis OR parse the error responseto detail the failure error message
			if (response.ok) {
				logger.debug(`Analysis update successuful`, analysis.studyId, analysis.analysisId);
				return success(analysis);
			}
			try {
				const responseBody = await response.json();
				const errorResponse = SongErrorResponse.safeParse(responseBody);
				if (errorResponse.success) {
					logger.error(`Analysis update failed`, analysis.studyId, analysis.analysisId, errorResponse.data);
					return failure(
						'Error response from Song for Update Analysis request',
						analysis.studyId,
						analysis.analysisId,
						errorResponse.data,
					);
				} else {
					logger.error(
						`Analysis update failed, reason could not be parsed`,
						analysis.studyId,
						analysis.analysisId,
						errorResponse.error,
					);
					return failure(
						'Error response from Song for Update Analysis request',
						analysis.studyId,
						analysis.analysisId,
						'Unexpected JSON format in error response:',
						errorResponse.error,
					);
				}
			} catch (e) {
				logger.error('Analysis update failed', e);
				return failure(
					'Error response from Song for Update Analysis request',
					analysis.studyId,
					analysis.analysisId,
					'Unable to parse song response.',
					e,
				);
			}
		} else {
			logger.error(`Failed to update analysis in song`, analysis.studyId, analysis.analysisId, ...fetchResult.errors);
			return failure('Failed to update analysis in song', analysis.studyId, analysis.analysisId, ...fetchResult.errors);
		}
	};

	return {
		getAnalysesPage,
		listStudies,
		updateAnalysis,
	};
}

export type SongClient = ReturnType<typeof createSongClient>;

export default createSongClient;
