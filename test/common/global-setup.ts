import { DynamoDBORM } from '../../lib';

const endpoint = 'http://localhost:8000';
const region = 'ap-northeast-1';

export default () => {
  DynamoDBORM.updateConfig({ region: region, endpoint: endpoint });
};
