import DynamoDBORM from './dynamodb-orm';

const AWS = require('aws-sdk');

const tableName = 'Music';
const endpoint = 'http://localhost:8000';
const region = 'ap-northeast-1';

beforeEach(() => {
  DynamoDBORM.updateConfig({ region: region, endpoint: new AWS.Endpoint(endpoint) });
});

describe('DynamoDBORM', () => {
  describe('HashKey is string', () => {
    let dynamodbOrm: DynamoDBORM;

    beforeEach(async () => {
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
      dynamodbOrm = new DynamoDBORM(tableName);
    });

    afterEach(async () => {
      const dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(endpoint) });
      await dynamodb
        .deleteTable({
          TableName: tableName,
        })
        .promise();
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
      expect(updateMusicObj).toEqual({
        Artist: 'sampleArtist',
        SongTitle: 'sampleSongTitle',
        CreaterName: 'updateName',
      });
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
      await dynamodbOrm.import([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
      expect(await dynamodbOrm.findBy({ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' })).toEqual({
        Artist: 'sampleArtist1',
        SongTitle: 'sampleSongTitle1',
      });
      expect(await dynamodbOrm.findBy({ Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' })).toEqual({
        Artist: 'sampleArtist2',
        SongTitle: 'sampleSongTitle2',
      });
    });

    it('findByAll', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
      ]);
      expect(await dynamodbOrm.findByAll({ Artist: 'sampleArtist' })).toEqual([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
      ]);
    });

    it('all', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
      const allData = await dynamodbOrm.all();
      expect(allData).toEqual([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
    });

    it('count', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
      expect(await dynamodbOrm.count()).toBe(2);
    });

    it('deleteAll', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
      await dynamodbOrm.deleteAll([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
      expect(await dynamodbOrm.count()).toBe(0);
    });

    it('where', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
      ]);
      expect(await dynamodbOrm.where({ Artist: 'sampleArtist' }).load()).toEqual([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
      ]);
    });

    it('offset', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle4' },
      ]);
      expect(await dynamodbOrm.offset({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' }).load()).toEqual([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle4' },
      ]);
    });

    it('limit', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' },
      ]);
      expect(await dynamodbOrm.limit(1)).toEqual([{ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' }]);
    });
  });

  describe('HashKey is number', () => {
    let dynamodbOrm: DynamoDBORM;

    beforeEach(async () => {
      const dynamodb = new AWS.DynamoDB();
      const params = {
        AttributeDefinitions: [
          {
            AttributeName: 'ArtistId',
            AttributeType: 'N',
          },
          {
            AttributeName: 'Major',
            AttributeType: 'B',
          },
        ],
        KeySchema: [
          {
            AttributeName: 'ArtistId',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'Major',
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
      dynamodbOrm = new DynamoDBORM(tableName);
    });

    afterEach(async () => {
      const dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(endpoint) });
      await dynamodb
        .deleteTable({
          TableName: tableName,
        })
        .promise();
    });

    it('create', async () => {
      const musicObj = await dynamodbOrm.create({ ArtistId: 1, Major: true });
      expect(musicObj).toEqual({ ArtistId: 1, Major: true });
    });

    it('findBy', async () => {
      await dynamodbOrm.create({ ArtistId: 1, Major: false, CreaterName: 'sampleName' });
      expect(await dynamodbOrm.findBy({ ArtistId: 1, Major: false })).toEqual({
        ArtistId: 1,
        Major: false,
        CreaterName: 'sampleName',
      });
    });

    it('update', async () => {
      await dynamodbOrm.create({ ArtistId: 1, Major: true, CreaterName: 'sampleName', Title: 'happy birthday' });
      const updateMusicObj = await dynamodbOrm.update({ ArtistId: 1, Major: true, Title: 'happy birthday' }, { CreaterName: 'updateName' });
      expect(updateMusicObj).toEqual({
        ArtistId: 1,
        Major: true,
        CreaterName: 'updateName',
        Title: 'happy birthday',
      });
      expect(await dynamodbOrm.findBy({ ArtistId: 1, Major: true })).toEqual({
        ArtistId: 1,
        Major: true,
        CreaterName: 'updateName',
        Title: 'happy birthday',
      });
    });

    it('delete', async () => {
      const musicObj = await dynamodbOrm.create({ ArtistId: 1, Major: true });
      const deletedObj = await dynamodbOrm.delete(musicObj);
      expect(deletedObj).toEqual(musicObj);
      expect(await dynamodbOrm.findBy(musicObj)).toBeUndefined();
    });

    it('import', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: false, tracks: [{ Title: 'hello' }, { Title: 'world' }] },
        { ArtistId: 3, Major: false, options: { soldout: false, price: 100 } },
      ]);
      expect(await dynamodbOrm.findBy({ ArtistId: 1, Major: true })).toEqual({
        ArtistId: 1,
        Major: true,
        Title: 'happy birthday',
      });
      expect(await dynamodbOrm.findBy({ ArtistId: 2, Major: false })).toEqual({
        ArtistId: 2,
        Major: false,
        tracks: [{ Title: 'hello' }, { Title: 'world' }],
      });
      expect(await dynamodbOrm.findBy({ ArtistId: 3, Major: false })).toEqual({
        ArtistId: 3,
        Major: false,
        options: { soldout: false, price: 100 },
      });
    });

    it('findByAll', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.findByAll({ Artist: 1, Title: 'happy birthday' })).toEqual([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
      ]);
    });

    it('all', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
      const allData = await dynamodbOrm.all();
      expect(allData).toEqual([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
    });

    it('count', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.count()).toBe(3);
    });

    it('deleteAll', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
      await dynamodbOrm.deleteAll([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.count()).toBe(1);
    });

    it('where', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.where({ Artist: 1, Title: 'happy birthday' }).load()).toEqual([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
      ]);
    });

    it('offset', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.offset({ ArtistId: 1, Major: true }).load()).toEqual([
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
    });

    it('limit', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
        { ArtistId: 2, Major: true, Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.limit(2)).toEqual([
        { ArtistId: 1, Major: false, Title: 'happy birthday' },
        { ArtistId: 1, Major: true, Title: 'happy birthday' },
      ]);
    });
  });
});
