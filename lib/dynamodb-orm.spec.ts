import DynamoDBORM from './dynamodb-orm';

const AWS = require('aws-sdk');

beforeAll(async () => {
  AWS.config.update({ region: 'ap-northeast-1' });
  const dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });
  const params = {
    AttributeDefinitions: [
      {
        AttributeName: 'Artist',
        AttributeType: 'S',
      },
      {
        AttributeName: 'SongTitle',
        AttributeType: 'S',
      },
    ],
    KeySchema: [
      {
        AttributeName: 'Artist',
        KeyType: 'HASH',
      },
      {
        AttributeName: 'SongTitle',
        KeyType: 'RANGE',
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
    TableName: 'Music',
  };
  await dynamodb.createTable(params).promise();
});

afterAll(async () => {
  const dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint('http://localhost:8000') });
  await dynamodb
    .deleteTable({
      TableName: 'Music',
    })
    .promise();
});

describe('DynamoORM', () => {
  it.skip('updateConfig', async () => {});
  it.skip('findBy', async () => {});
  it.skip('findByAll', async () => {});
  it.skip('update', async () => {});
  it.skip('create', async () => {});
  it.skip('delete', async () => {});
  it.skip('all', async () => {});
  it.skip('where', async () => {});
});

describe('DynamoORMRelation', () => {
  it.skip('load', async () => {});
  it.skip('where', async () => {});
  it.skip('clear', async () => {});
});
