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

import { createTransformChain } from '../../transform';
import cs3to4 from './03_to_04';
import cs4to5 from './04_to_05';
import cs5to6 from './05_to_06';
import cs6to7 from './06_to_07';
import cs7to8 from './07_to_08';
import cs8to9 from './08_to_09';
import cs9to10 from './09_to_10';
import cs10to11 from './10_to_11';
import cs11to12 from './11_to_12';
import cs12to13 from './12_to_13';
import cs13to14 from './13_to_14';
import cs14to15 from './14_to_15';
import cs15to16 from './15_to_16';
import cs16to17 from './16_to_17';
import cs17to18 from './17_to_18';
import cs18to19 from './18_to_19';
import cs19to20 from './19_to_20';
import cs20to21 from './20_to_21';
import cs21to22 from './21_to_22';

const migrationChain = createTransformChain(
	cs3to4,
	cs4to5,
	cs5to6,
	cs6to7,
	cs7to8,
	cs8to9,
	cs9to10,
	cs10to11,
	cs11to12,
	cs12to13,
	cs13to14,
	cs14to15,
	cs15to16,
	cs16to17,
	cs17to18,
	cs18to19,
	cs19to20,
	cs20to21,
	cs21to22
);

if (!migrationChain.success) {
	throw new Error(['Unable to initialize migration chain', ...migrationChain.errors].join(' -- '));
}

export default migrationChain.data;
