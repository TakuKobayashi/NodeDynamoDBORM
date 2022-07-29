import { DynamoDBORM } from '../../lib';
import { DynamoDBORMRelation } from '../../lib/dynamodb-orm-relation';
import { DynamoDBConnection } from '../../lib/dynamodb-connection';
import { CreateTableCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { describe, beforeAll, afterAll, beforeEach, afterEach, expect, it } from '@jest/globals';

const tableName = 'Music';
const endpoint = 'http://localhost:8000';
const region = 'ap-northeast-1';

beforeAll(() => {
  DynamoDBConnection.confingurations({ region: region, endpoint: endpoint });
});

afterAll(() => {
  DynamoDBConnection.destroy();
});

describe('DynamoDBORM', () => {
  describe('HashKey is string', () => {
    let dynamodbOrm: DynamoDBORM;
    let dynamodbOrmRelation: DynamoDBORMRelation;

    beforeEach(async () => {
      const dynamodbClient = DynamoDBConnection.dynamodbClient;
      const params = new CreateTableCommand({
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
      });
      await dynamodbClient.send(params);
      dynamodbOrm = new DynamoDBORM(tableName);
      dynamodbOrmRelation = new DynamoDBORMRelation(tableName);
    });

    afterEach(async () => {
      const dynamodbClient = DynamoDBConnection.dynamodbClient;
      await dynamodbClient.send(
        new DeleteTableCommand({
          TableName: tableName,
        }),
      );
    });

    it('where', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
      ]);

      expect(await dynamodbOrmRelation.where({ Artist: 'sampleArtist' }).load()).toEqual([
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
      expect(await dynamodbOrmRelation.offset({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' }).load()).toEqual([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle4' },
      ]);
    });

    it('load', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
      const planeLoad = await dynamodbOrmRelation.load();
      expect(planeLoad).toEqual([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
    });

    it('count', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
      ]);
      expect(await dynamodbOrmRelation.count()).toBe(2);
    });

    it('filterCount', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist1', SongTitle: 'sampleSongTitle2' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle2' },
        { Artist: 'sampleArtist2', SongTitle: 'sampleSongTitle3' },
      ]);
      expect(await dynamodbOrmRelation.where({ Artist: 'sampleArtist1' }).count()).toBe(2);
    });

    it('exists', async () => {
      await dynamodbOrm.import([
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle1' },
        { Artist: 'sampleArtist', SongTitle: 'sampleSongTitle2' },
      ]);
      expect(await dynamodbOrmRelation.exists({ Artist: 'sampleArtist' })).toBe(true);
      expect(await dynamodbOrmRelation.exists({ Artist: 'sampleArtist', SongTitle: 'sampleSongTitle3' })).toBe(false);
    });
  });
});
