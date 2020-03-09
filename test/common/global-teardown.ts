import { DynamoDBORM } from '../../lib';

export default () => {
  DynamoDBORM.clearTableCache();
};
