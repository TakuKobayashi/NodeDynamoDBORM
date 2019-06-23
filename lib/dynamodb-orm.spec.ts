import DynamoDBORM from './dynamodb-orm';

const AWS = require('aws-sdk');

const tableName = 'Music';
const endpoint = 'http://localhost:8000';
const region = 'ap-northeast-1';

beforeEach(async () => {
  DynamoDBORM.updateConfig({ region: region, endpoint: new AWS.Endpoint(endpoint) });
  const dynamodb = new AWS.DynamoDB();
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
    TableName: tableName,
  };
  await dynamodb.createTable(params).promise();
});

afterEach(async () => {
  const dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(endpoint) });
  await dynamodb
    .deleteTable({
      TableName: tableName,
    })
    .promise();
});

describe('DynamoDBORM', () => {
  let dynamodbOrm: DynamoDBORM;

  beforeEach(() => {
    dynamodbOrm = new DynamoDBORM(tableName);
  });

  it('create', async () => {
    const musicObj = await dynamodbOrm.create({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle' });
    expect(musicObj).toEqual({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle' });
  });

  it('findBy', async () => {
    await dynamodbOrm.create({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle', CreaterName: 'sampleName' });
    expect(await dynamodbOrm.findBy({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle' })).toEqual({
      Artist: 'sampleArtist',
      SongTitle: 'sampleSongTitle',
      CreaterName: 'sampleName',
    });
  });

  it('update', async () => {
    await dynamodbOrm.create({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle', CreaterName: 'sampleName' });
    const updateMusicObj = await dynamodbOrm.update(
      { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle' },
      { CreaterName: 'updateName' },
    );
    expect(updateMusicObj).toEqual({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle', CreaterName: 'updateName' });
    expect(await dynamodbOrm.findBy({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle' })).toEqual({
      Artist: 'sampleArtist',
      SongTitle: 'sampleSongTitle',
      CreaterName: 'updateName',
    });
  });

  it('delete', async () => {
    const musicObj = await dynamodbOrm.create({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle' });
    const deletedObj = await dynamodbOrm.delete(musicObj);
    expect(deletedObj).toEqual(musicObj);
    expect(await dynamodbOrm.findBy(musicObj)).toBeUndefined();
  });


  it('import', async () => {
    await dynamodbOrm.import([{ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' }, { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' }]);
    expect(await dynamodbOrm.findBy({ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' })).toEqual({
      Artist: 'sampleArtist1',
      SongTitle: 'sampleSongTitle1'
    });
    expect(await dynamodbOrm.findBy({ Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' })).toEqual({
      Artist: 'sampleArtist2',
      SongTitle: 'sampleSongTitle2'
    });
  });

  it('findByAll', async () => {
    await dynamodbOrm.import([{ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' }, { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' }]);
    expect(await dynamodbOrm.findByAll({Artist: 'sampleArtist'})).toEqual([{ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' }, { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' }]);
  });

  it('all', async () => {
    await dynamodbOrm.import([{ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' }, { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' }]);
    const allData = await dynamodbOrm.all();
    expect(allData).toEqual([{ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' }, { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' }]);
  });

  it('count', async () => {
    await dynamodbOrm.import([{ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' }, { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' }]);
    expect(await dynamodbOrm.count()).toBe(2);
  });

  it('deleteAll', async () => {
    await dynamodbOrm.import([{ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' }, { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' }]);
    await dynamodbOrm.deleteAll([{ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' }, { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' }]);
    expect(await dynamodbOrm.count()).toBe(0);
  });
});
