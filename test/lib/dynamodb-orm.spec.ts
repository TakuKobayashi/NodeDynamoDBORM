import { DynamoDBORM } from '../../lib';

const AWS = require('aws-sdk');

const tableName = 'Music';
const endpoint = 'http://localhost:8000';
const region = 'ap-northeast-1';

beforeEach(() => {
  DynamoDBORM.updateConfig({ region: region, endpoint: endpoint });
});

afterEach(() => {
  DynamoDBORM.clearTableCache();
  DynamoDBORM.clearConfig();
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
      const isDeleteSuccess = await dynamodbOrm.delete(musicObj);
      expect(isDeleteSuccess).toBeTruthy();
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

    it('exists', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
      ]);
      expect(await dynamodbOrm.exists({ Artist: 'sampleArtist' })).toBe(true);
      expect(await dynamodbOrm.exists({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' })).toBe(false);
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

    it('findEach', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle4' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle5' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle6' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle7' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle8' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle9' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle10' },
      ]);
      await dynamodbOrm.findEach(async (record) => {
        expect(await dynamodbOrm.exists(record)).toBeTruthy();
      }, { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' }, 2);
    });

    it('findInBatches', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle4' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle5' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle6' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle7' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle8' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle9' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle10' },
      ]);
      await dynamodbOrm.findInBatches(async (records) => {
        for(const recordObject of records){
          expect(await dynamodbOrm.exists(recordObject)).toBeTruthy();
        }
      }, { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' }, 2);
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
            AttributeName: 'SongTitle',
            AttributeType: 'B',
          },
        ],
        KeySchema: [
          {
            AttributeName: 'ArtistId',
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
      const musicObj = await dynamodbOrm.create({ ArtistId: 1, SongTitle: new Buffer('sampleSongTitle') });
      expect(musicObj).toEqual({ ArtistId: 1, SongTitle: new Buffer('sampleSongTitle') });
    });

    it('findBy', async () => {
      await dynamodbOrm.create({ ArtistId: 1, SongTitle: new Buffer('sampleSongTitle'), CreaterName: 'sampleName' });
      expect(await dynamodbOrm.findBy({ ArtistId: 1, SongTitle: new Buffer('sampleSongTitle') })).toEqual({
        ArtistId: 1,
        SongTitle: new Buffer('sampleSongTitle'),
        CreaterName: 'sampleName',
      });
    });

    it('update', async () => {
      await dynamodbOrm.create({
        ArtistId: 1,
        SongTitle: new Buffer('sampleSongTitle'),
        CreaterName: 'sampleName',
        Title: 'happy birthday',
      });
      const updateMusicObj = await dynamodbOrm.update(
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle') },
        { CreaterName: 'updateName' },
      );
      expect(updateMusicObj).toEqual({
        ArtistId: 1,
        SongTitle: new Buffer('sampleSongTitle'),
        CreaterName: 'updateName',
        Title: 'happy birthday',
      });
      expect(await dynamodbOrm.findBy({ ArtistId: 1, SongTitle: new Buffer('sampleSongTitle') })).toEqual({
        ArtistId: 1,
        SongTitle: new Buffer('sampleSongTitle'),
        CreaterName: 'updateName',
        Title: 'happy birthday',
      });
    });

    it('delete', async () => {
      const musicObj = await dynamodbOrm.create({ ArtistId: 1, SongTitle: new Buffer('sampleSongTitle') });
      const isDeleteSuccess = await dynamodbOrm.delete(musicObj);
      expect(isDeleteSuccess).toBeTruthy();
      expect(await dynamodbOrm.findBy(musicObj)).toBeUndefined();
    });

    it('import', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle'), tracks: [{ Title: 'hello' }, { Title: 'world' }] },
        { ArtistId: 3, SongTitle: new Buffer('sampleSongTitle'), options: { soldout: false, price: 100 } },
      ]);
      expect(await dynamodbOrm.findBy({ ArtistId: 1, SongTitle: new Buffer('sampleSongTitle') })).toEqual({
        ArtistId: 1,
        SongTitle: new Buffer('sampleSongTitle'),
        Title: 'happy birthday',
      });
      expect(await dynamodbOrm.findBy({ ArtistId: 2, SongTitle: new Buffer('sampleSongTitle') })).toEqual({
        ArtistId: 2,
        SongTitle: new Buffer('sampleSongTitle'),
        tracks: [{ Title: 'hello' }, { Title: 'world' }],
      });
      expect(await dynamodbOrm.findBy({ ArtistId: 3, SongTitle: new Buffer('sampleSongTitle') })).toEqual({
        ArtistId: 3,
        SongTitle: new Buffer('sampleSongTitle'),
        options: { soldout: false, price: 100 },
      });
    });

    it('findByAll', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.findByAll({ ArtistId: 1, Title: 'happy birthday' })).toEqual([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
    });

    it('all', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
      const allData = await dynamodbOrm.all();
      expect(allData).toEqual([
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
    });

    it('count', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.count()).toBe(3);
    });

    it('deleteAll', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
      await dynamodbOrm.deleteAll([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1') },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2') },
      ]);
      expect(await dynamodbOrm.count()).toBe(1);
    });

    it('where', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.where({ ArtistId: 1, Title: 'happy birthday' }).load()).toEqual([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
    });

    it('where In', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'hello' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle3'), Title: 'world' },
      ]);
      expect(await dynamodbOrm.where({ ArtistId: 1, Title: ['hello', 'world'] }).load()).toEqual([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'hello' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle3'), Title: 'world' },
      ]);
    });

    it('exists', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.exists({ ArtistId: 1, Title: 'happy birthday' })).toBe(true);
      expect(await dynamodbOrm.exists({ ArtistId: 3, Title: 'happy birthday' })).toBe(false);
    });

    it('offset', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 3, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.offset({ ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2') }).load()).toEqual([
        { ArtistId: 3, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
    });

    it('limit', async () => {
      await dynamodbOrm.import([
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
      ]);
      expect(await dynamodbOrm.limit(2)).toEqual([
        { ArtistId: 2, SongTitle: new Buffer('sampleSongTitle2'), Title: 'happy birthday' },
        { ArtistId: 1, SongTitle: new Buffer('sampleSongTitle1'), Title: 'happy birthday' },
      ]);
    });
  });

  describe('transaction', () => {
    const secondTableName = 'Shop';

    beforeEach(async () => {
      const dynamodb = new AWS.DynamoDB();
      const MusicTableParams = {
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
      await dynamodb.createTable(MusicTableParams).promise();

      const ShopTableParams = {
        AttributeDefinitions: [
          {
            AttributeName: 'ShopId',
            AttributeType: 'S',
          },
          {
            AttributeName: 'Name',
            AttributeType: 'S',
          },
        ],
        KeySchema: [
          {
            AttributeName: 'ShopId',
            KeyType: 'HASH',
          },
          {
            AttributeName: 'Name',
            KeyType: 'RANGE',
          },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
        TableName: secondTableName,
      };
      await dynamodb.createTable(ShopTableParams).promise();
    });

    afterEach(async () => {
      const dynamodb = new AWS.DynamoDB({ endpoint: new AWS.Endpoint(endpoint) });
      await dynamodb
        .deleteTable({
          TableName: tableName,
        })
        .promise();

      await dynamodb
        .deleteTable({
          TableName: secondTableName,
        })
        .promise();
    });

    describe('sameTables', () => {
      describe('instance method', () => {
        it('create, delete, update', async () => {
          const musicDynamodbOrm = new DynamoDBORM(tableName);
          await musicDynamodbOrm.import([
            { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1', createrName: 'test1' },
            { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2', createrName: 'test2' },
          ]);
          await musicDynamodbOrm.transaction(async () => {
            await musicDynamodbOrm.create({
              Artist: 'sampleArtist3',
              SongTitle: 'sampleSongTitle3',
              createrName: 'test3',
            });
            await musicDynamodbOrm.update(
              {
                Artist: 'sampleArtist2',
                SongTitle: 'sampleSongTitle2',
              },
              { createrName: 'hogehoge' },
            );
            await musicDynamodbOrm.delete({ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' });
          });

          expect(await musicDynamodbOrm.all()).toEqual([
            { Artist: 'sampleArtist3', SongTitle: 'sampleSongTitle3', createrName: 'test3' },
            { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2', createrName: 'hogehoge' },
          ]);
        });
      });

      describe('static method', () => {
        it('create, delete, update', async () => {
          const musicDynamodbOrm = new DynamoDBORM(tableName);
          await musicDynamodbOrm.import([
            { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1', createrName: 'test1' },
            { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2', createrName: 'test2' },
          ]);
          await DynamoDBORM.transaction(async () => {
            await musicDynamodbOrm.create({
              Artist: 'sampleArtist3',
              SongTitle: 'sampleSongTitle3',
              createrName: 'test3',
            });
            await musicDynamodbOrm.update(
              {
                Artist: 'sampleArtist2',
                SongTitle: 'sampleSongTitle2',
              },
              { createrName: 'hogehoge' },
            );
            await musicDynamodbOrm.delete({ Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' });
          });

          expect(await musicDynamodbOrm.all()).toEqual([
            { Artist: 'sampleArtist3', SongTitle: 'sampleSongTitle3', createrName: 'test3' },
            { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2', createrName: 'hogehoge' },
          ]);
        });
      });
    });

    describe('anothorTables', () => {
      describe('instance method', () => {
        it('create, delete, update', async () => {
          const musicDynamodbOrm = new DynamoDBORM(tableName);
          await musicDynamodbOrm.import([
            { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1', createrName: 'test1' },
            { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2', createrName: 'test2' },
          ]);
          const shopDynamodbOrm = new DynamoDBORM(secondTableName);
          await shopDynamodbOrm.import([
            { ShopId: '1', Name: 'sampleShope1', placeName: 'shopTest1' },
            { ShopId: '2', Name: 'sampleShope2', placeName: 'shopTest2' },
            { ShopId: '3', Name: 'sampleShope3', placeName: 'shopTest3' },
          ]);
          await musicDynamodbOrm.transaction(async () => {
            await musicDynamodbOrm.create({
              Artist: 'sampleArtist3',
              SongTitle: 'sampleSongTitle3',
              createrName: 'test3',
            });
            await shopDynamodbOrm.update({ ShopId: '1', Name: 'sampleShope1' }, { placeName: 'hogehoge' });
            await shopDynamodbOrm.delete({ ShopId: '2', Name: 'sampleShope2' });
          });

          expect(await musicDynamodbOrm.all()).toEqual([
            { Artist: 'sampleArtist3', SongTitle: 'sampleSongTitle3', createrName: 'test3' },
            { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1', createrName: 'test1' },
            { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2', createrName: 'test2' },
          ]);
          expect(await shopDynamodbOrm.all()).toEqual([
            { ShopId: '1', Name: 'sampleShope1', placeName: 'hogehoge' },
            { ShopId: '3', Name: 'sampleShope3', placeName: 'shopTest3' },
          ]);
        });
      });

      describe('static method', () => {
        it('create, delete, update', async () => {
          const musicDynamodbOrm = new DynamoDBORM(tableName);
          await musicDynamodbOrm.import([
            { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1', createrName: 'test1' },
            { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2', createrName: 'test2' },
          ]);
          const shopDynamodbOrm = new DynamoDBORM(secondTableName);
          await shopDynamodbOrm.import([
            { ShopId: '1', Name: 'sampleShope1', placeName: 'shopTest1' },
            { ShopId: '2', Name: 'sampleShope2', placeName: 'shopTest2' },
            { ShopId: '3', Name: 'sampleShope3', placeName: 'shopTest3' },
          ]);
          await DynamoDBORM.transaction(async () => {
            await musicDynamodbOrm.create({
              Artist: 'sampleArtist3',
              SongTitle: 'sampleSongTitle3',
              createrName: 'test3',
            });
            await shopDynamodbOrm.update({ ShopId: '1', Name: 'sampleShope1' }, { placeName: 'hogehoge' });
            await shopDynamodbOrm.delete({ ShopId: '2', Name: 'sampleShope2' });
          });

          expect(await musicDynamodbOrm.all()).toEqual([
            { Artist: 'sampleArtist3', SongTitle: 'sampleSongTitle3', createrName: 'test3' },
            { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1', createrName: 'test1' },
            { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2', createrName: 'test2' },
          ]);
          expect(await shopDynamodbOrm.all()).toEqual([
            { ShopId: '1', Name: 'sampleShope1', placeName: 'hogehoge' },
            { ShopId: '3', Name: 'sampleShope3', placeName: 'shopTest3' },
          ]);
        });
      });
    });
  });
});
