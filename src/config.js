/**
 * @module config
 * @overview encrypted configuration provider
 */
import { GetParametersCommand } from '@aws-sdk/client-ssm';
import get from 'lodash.get';
import merge from 'lodash.merge';

export const inject = {
  name: 'config',
  require: ['ssm'],
};

export default async function (ssm) {
  // fetch configuration from secure parameter store, aborting after 30 seconds
  const data = await ssm.send(
    new GetParametersCommand({
      Names: process.env.CONFIG_PARAMETER_NAMES.split(','),
      WithDecryption: true,
    }),
    { abortSignal: AbortSignal.timeout(30000) },
  );

  // parse configuration and merge together
  const config = data.Parameters.reduce((acc, p) => merge(acc, JSON.parse(p.Value)), {});

  return {
    /**
     * Expose a getter method for retrieiving portions of the decrypted
     * configuration tree
     * @param {String} path - path using dot notation
     */
    get: get.bind(null, config),
  };
}
