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

import * as dotenv from 'dotenv';
import * as vault from './external/vault';

import Logger from './logger';
const logger = Logger('Config');

dotenv.config();

/* ===== Secret Retrieval and Access */
type Secrets = {
	credentials: {
		id: string;
		secret: string;
	};
};
let secrets: Secrets | undefined = undefined;

const loadVaultSecrets = async () => {
	const vaultEnabled = process.env.VAULT_ENABLED === 'true';
	let secrets: any = {};

	/** Vault */
	if (vaultEnabled) {
		if (process.env.VAULT_ENABLED && process.env.VAULT_ENABLED === 'true') {
			if (!process.env.VAULT_SECRETS_PATH) {
				logger.error('Path to secrets not specified but vault is enabled');
				throw new Error('Path to secrets not specified but vault is enabled');
			}
			try {
				secrets = await vault.loadSecret(process.env.VAULT_SECRETS_PATH);
			} catch (err) {
				logger.error('Failed to load secrets from vault.', err);
				throw err;
			}
		}
	}
	return secrets;
};

export const getSecrets = async (): Promise<Secrets> => {
	if (secrets) {
		return secrets;
	}
	const vaultSecrets = await loadVaultSecrets();
	secrets = {
		credentials: {
			id: vaultSecrets.EGO_CLIENT_ID || process.env.EGO_CLIENT_ID || '',
			secret: vaultSecrets.EGO_CLIENT_SECRET || process.env.EGO_CLIENT_SECRET || '',
		},
	};
	return secrets;
};

const config = {
	ego: {
		host: process.env.EGO_HOST || '',
	},
	song: {
		host: process.env.SONG_HOST || '',
		name: process.env.SONG_ENV,
		pageSize: Number(process.env.SONG_PAGE_SIZE) || 100,
		maxConcurrent: Number(process.env.SONG_CONCURRENT_REQUESTS) || 5,
	},
};
export default config;
