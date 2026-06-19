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

import _ from 'lodash';
import { z as zod } from 'zod';
import { Analysis } from '../../../external/song/types';
import { Result } from '../../../types';
import { failure, success } from '../../../types/result';
import { defineTransform } from '../../transform';
import { CS_NAME } from './constants';

/*
 * Version 2 to 3 Transform
 * - Passthrough: schema v2→v3 removed duplicate `required` entries and added `samples`
 *   to the explicit properties list. The analysis data itself is unchanged.
 */

const InputSchema = zod.object({
	analysisType: zod.object({
		name: zod.literal(CS_NAME),
		version: zod.literal(2),
	}),
});
type InputSchema = zod.infer<typeof InputSchema>;

const matchesInputSchema = (input: Analysis): input is Analysis & InputSchema => InputSchema.safeParse(input).success;

const transform = (analysis: Analysis): Result<Analysis> => {
	if (!matchesInputSchema(analysis)) {
		return failure('Provided analysis does not match the version 2 schema and cannot be migrated to version 3');
	}

	return success(_.cloneDeep(analysis));
};

export default defineTransform({ start: { name: CS_NAME, version: 2 }, end: { name: CS_NAME, version: 3 } }, transform);
