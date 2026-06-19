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

import { AnalysisFilters, SongClient } from '../external/song';
import { Analysis, PagedAnalysisResponse } from '../external/song/types';
import { asyncPipe, pipe } from '../structures/pipe';
import consensusSequenceMigrationChain from '../migration/transforms/consensus_sequence';
import { TransformChain } from '../migration/transform';
import { CS_NAME } from '../migration/transforms/consensus_sequence/constants';

import { withResultAsync } from '../types/result';
import migrateAnalyses from './migrateAnalyses';
import Logger from '../logger';
import once from '../structures/once';
import config from '../config';
import { Result } from '../types';
import limitConcurrency from '../structures/limitConcurrency';
import { mapAsync } from '../utils/arrayUtils';
const logger = Logger('Task', 'migrateAndUpdateStudy');

type MigrationSummary = {
	study: string;
	completed: boolean;
	counts: {
		successful: number;
		error: number;
		skipped: number;
		processed: number;
		total: number;
	};
};

/**
 * Fetch from song all analyses for a study, one page at a time. As analyses are retrieved
 *  migrate them to the latest schema then request song to update them to the latest verison.
 * @param songClient
 * @returns function to migrate all analyses in a study using the provided song client
 */
const migrateAndUpdateStudy =
	(songClient: SongClient, latestSchemaVersion: number | undefined) =>
	async (study: string): Promise<MigrationSummary> => {
		/* ===== State Setup and Summary object ===== */
		const filters: AnalysisFilters = {
			states: ['PUBLISHED'],
			study,
		};

		const summary: MigrationSummary = {
			study,
			completed: false,
			counts: {
				successful: 0,
				error: 0,
				skipped: 0,
				processed: 0,
				total: 0,
			},
		};

		let totalAnalyses = 0;
		let nextOffset = 0;
		const pageSize = config.song.pageSize;

		/* ===== Determine active chain (capped at SONG's highest registered schema version) ===== */
		let activeChain: TransformChain = consensusSequenceMigrationChain;
		if (latestSchemaVersion !== undefined) {
			const limitedChainResult = consensusSequenceMigrationChain.to({ name: CS_NAME, version: latestSchemaVersion });
			if (limitedChainResult.success) {
				activeChain = limitedChainResult.data;
			} else {
				logger.warn(`Could not limit chain to SONG schema version ${latestSchemaVersion}, using full chain`, ...limitedChainResult.errors);
			}
		}

		/* ===== Functions to Help Update Each page of Analyses ===== */
		const filterSkippedAnalyses = (analyses: Analysis[]): Analysis[] => {
			const filtered = analyses.filter(
				(analysis) =>
					analysis.analysisType.version >= activeChain.getStart().version &&
					analysis.analysisType.version < activeChain.getEnd().version,
			);
			const skipped = analyses.length - filtered.length;
			summary.counts.skipped += skipped;
			summary.counts.processed += skipped;
			return filtered;
		};

		const applyMigrationsToPage = pipe((page: PagedAnalysisResponse) => page.analyses)
			.into(filterSkippedAnalyses)
			.into(migrateAnalyses(activeChain))
			.build();

		const oneTimeLogger = once((page: PagedAnalysisResponse) => {
			summary.counts.total = page.totalAnalyses;
			logger.info(
				`Beginning Fetching Analyses by pages for study:`,
				study,
				`Total Analyses:`,
				page.totalAnalyses,
				`Expected Pages:`,
				Math.ceil(page.totalAnalyses / pageSize),
			);
		});
		const fetchNextPage = async (): Promise<Result<PagedAnalysisResponse>> => {
			const result = await songClient.getAnalysesPage(filters, { offset: nextOffset, limit: pageSize });
			if (result.success) {
				// log total page count first run only
				oneTimeLogger(result.data);

				totalAnalyses = result.data.totalAnalyses;
				nextOffset = nextOffset + pageSize;
			}
			return result;
		};

		// Restrict number of requests in flight at a time, based on config
		const sendAnalysisUpdate = limitConcurrency(config.song.maxConcurrent, withResultAsync(songClient.updateAnalysis));

		/* ===== The Actual Work ===== */
		// Fetch pages of analyses and migrate them until there are no more left in the study
		do {
			/**
			 * 1. Fetch a page of analyses
			 * 2. Apply migrations to all analyses in that page
			 * 3. Update each analysis in Song (concurrency limited)
			 */
			const pageResult = await asyncPipe((_: void) => fetchNextPage())
				.into(applyMigrationsToPage)
				.await(mapAsync(sendAnalysisUpdate))
				.run();

			if (!pageResult.success) {
				logger.error(...pageResult.errors);
				return summary;
			}

			// Update summary object based on result of each analysis' update call
			pageResult.data.forEach((result) => {
				if (result.success) {
					summary.counts.successful++;
					summary.counts.processed++;
					logger.info(
						`Analysis ${summary.counts.processed} of ${summary.counts.total}`,
						result.data.studyId,
						result.data.analysisId,
					);
				} else {
					summary.counts.error++;
					summary.counts.processed++;
					logger.error(...result.errors);
				}
			});

			//log progress
			logger.info('Progress', summary);
		} while (nextOffset < totalAnalyses);

		// Return summary as complete.
		return { ...summary, completed: true };
	};
export default migrateAndUpdateStudy;
