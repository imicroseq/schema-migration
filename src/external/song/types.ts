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

import { z as zod, ZodObject } from 'zod';

const CommonInfo = zod.object({}).passthrough();

export const AnalysisState = zod.enum(['PUBLISHED', 'UNPUBLISHED', 'SUPPRESSED']);
export type AnalysisState = zod.infer<typeof AnalysisState>;

export const AnalysisType = zod.object({
	name: zod.string(),
	version: zod.number(),
});
export type AnalysisType = zod.infer<typeof AnalysisType>;

const FileAccess = zod.enum(['open', 'controlled']);
export type FileAccess = zod.infer<typeof FileAccess>;

const FileData = zod
	.object({
		studyId: zod.string(),
		objectId: zod.string(),

		dataType: zod.string(),
		fileName: zod.string(),
		fileSize: zod.number(),
		fileType: zod.string(),
		fileAccess: FileAccess,
		fileMd5sum: zod.string(),
	})
	.passthrough();
export type FileData = zod.infer<typeof FileData>;

const Specimen = zod.object({
	submitterSpecimenId: zod.string(),
	tumourNormalDesignation: zod.string(),
	specimenTissueSource: zod.string(),
	specimenType: zod.string(),
});
export type Specimen = zod.infer<typeof Specimen>;

const Donor = zod.object({
	gender: zod.string(),
	submitterDonorId: zod.string(),
});
export type Donor = zod.infer<typeof Donor>;

const Sample = zod.object({
	submitterSampleId: zod.string(),
	matchedNormalSubmitterSampleId: zod.string().nullable(),
	sampleType: zod.string(),
	specimen: Specimen,
	donor: Donor,
});
export type Sample = zod.infer<typeof Sample>;

const AnalysisStateChange = zod.object({
	initialState: AnalysisState,
	updatedState: AnalysisState,
	updatedAt: zod.string(),
});
export type AnalysisStateChange = zod.infer<typeof AnalysisStateChange>;

export type AnalysisSchema = { analysisType: AnalysisType };

export const Analysis = zod
	.object({
		analysisType: AnalysisType,
		analysisState: AnalysisState,
		analysisId: zod.string(),
		studyId: zod.string(),
		createdAt: zod.string(),
		updatedAt: zod.string(),

		firstPublishedAt: zod.nullable(zod.string()),
		publishedAt: zod.nullable(zod.string()),
		analysisStateHistory: zod.array(AnalysisStateChange),

		files: zod.array(FileData),
		samples: zod.array(Sample),
	})
	.passthrough();
export type Analysis = zod.infer<typeof Analysis>;

export const PagedResponse = zod.object({
	totalAnalyses: zod.number(),
	currentTotalAnalyses: zod.number(),
});
export type PagedResponse = zod.infer<typeof PagedResponse>;

export const PagedAnalysisResponse = zod
	.object({
		analyses: zod.array(Analysis),
	})
	.merge(PagedResponse);
export type PagedAnalysisResponse = zod.infer<typeof PagedAnalysisResponse>;

export const SongErrorResponse = zod.object({
	errorId: zod.string(),
	httpStatusCode: zod.number(),
	message: zod.string(),
});
export type SongErrorResponse = zod.infer<typeof SongErrorResponse>;
