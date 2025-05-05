/**
 * @module github
 * @overview implements functionality related to describing and updating github
 * pull requests
 */
import get from 'lodash.get';

export const inject = {
  name: 'github',
  require: ['config', 'http'],
};

export default function (config, http) {
  const owner = config.get('github.owner');

  /**
   * Lookup the head sha for a given project pull request
   * @param  {Object}  params
   * @param  {String}  params.project - project name
   * @param  {String}  params.version - source version
   * @return {Promise}
   */
  async function getShaForPr({ project, version }) {
    const number = version.split('/')[1];
    const { data } = await http.get(`/repos/${owner}/${project}/pulls/${number}`);
    return get(data, 'head.sha');
  }

  /**
   * Update the status of the head commit for a given project pull request
   * @param  {Object}  params
   * @param  {String}  params.context     - status context
   * @param  {String}  params.description - status description
   * @param  {String}  params.project     - project name
   * @param  {String}  params.state       - status state
   * @param  {String}  params.target_url  - status target url
   * @param  {String}  params.version     - source version
   * @return {Promise}
   */
  async function updateStatus({
    context, description, project, state, targetUrl, version,
  }) {
    const sha = await getShaForPr({ project, version });
    return http.post(`/repos/${owner}/${project}/statuses/${sha}`, {
      state, targetUrl, description, context,
    });
  }

  return {
    getShaForPr,
    updateStatus,
  };
}
