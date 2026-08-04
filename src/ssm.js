/**
 * @module ssm
 * @overview expose underlying aws drivers for testing purposes
 */
import { SSMClient } from '@aws-sdk/client-ssm';

export const inject = {
  name: 'ssm',
};

export default function () {
  return new SSMClient();
}
