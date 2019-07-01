import { DynamoDBORMRelation } from './dynamodb-orm-relation';
import { DynamoDBORMBase } from './dynamodb-orm-base';
import { TransactionWriterStates } from './dynamodb-transaction-states';

export class DynamoDBORM extends DynamoDBORMBase {
  private static transactionWriterStates: TransactionWriterStates = {
    isInnerTransaction: false,
    writerItems: [],
  };

  constructor(tableName: string) {
    super(tableName);
    if (!DynamoDBORM.transactionWriterStates.isInnerTransaction) {
      DynamoDBORM.clearTransactionState();
    }
  }

  private static clearTransactionState(): void {
    DynamoDBORM.transactionWriterStates = {
      isInnerTransaction: false,
      writerItems: [],
    };
  }

  /**
   * get data from primaryKeys.
   * @param {object} filterObject is primaryKeyName and value Object.
   * @return {object} dynamodb table a row object
   */
  async findBy(filterObject: { [s: string]: any }): Promise<{ [s: string]: any }> {
    const params = {
      TableName: this.tableName,
      Key: filterObject,
    };
    const result = await this.dynamoClient.get(params).promise();
    return result.Item as { [s: string]: any };
  }

  /**
   * search query data from primaryKey.
   * @param {object} filterObject is primaryKeyName and value Object.
   * @return {array[object]} dynamodb table row objects
   */
  async findByAll(filterObject: { [s: string]: any }): Promise<{ [s: string]: any }[]> {
    const filterQueryExpressions = await this.generateFilterQueryExpression(filterObject);
    const params = {
      TableName: this.tableName,
      ...filterQueryExpressions,
    };
    const queryResult = await this.dynamoClient.query(params).promise();
    return queryResult.Items as { [s: string]: any }[];
  }

  /**
   * update row data.
   * @param {object} filterObject is primaryKeyName and value Object.
   * @param {object} updateObject is update obejct.
   * @return {object} updated object
   */
  async update(filterObject: { [s: string]: any }, updateObject: { [s: string]: any }): Promise<{ [s: string]: any }> {
    let updateExpressionString = 'set ';
    const updateExpressionAttributeValues = {};
    const keys = Object.keys(updateObject);
    for (let i = 0; i < keys.length; ++i) {
      const praceholder = ':Attr' + i.toString();
      updateExpressionString = updateExpressionString + keys[i] + ' = ' + praceholder;
      if (i !== keys.length - 1) {
        updateExpressionString = updateExpressionString + ', ';
      }
      updateExpressionAttributeValues[praceholder] = updateObject[keys[i]];
    }
    const params = {
      TableName: this.tableName,
      Key: filterObject,
      UpdateExpression: updateExpressionString,
      ExpressionAttributeValues: updateExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    if (DynamoDBORM.transactionWriterStates.isInnerTransaction) {
      DynamoDBORM.transactionWriterStates.writerItems.push({ Update: params });
      return updateObject;
    } else {
      const updateResult = await this.dynamoClient.update(params).promise();
      return updateResult.Attributes as { [s: string]: any };
    }
  }

  /**
   * create new row  data.
   * @param {object} putObject is a object inserting to dynamodb.
   * @return {object} created object
   */
  async create(putObject: { [s: string]: any }): Promise<{ [s: string]: any }> {
    const params = {
      TableName: this.tableName,
      Item: putObject,
      ReturnValues: 'ALL_OLD',
    };
    if (DynamoDBORM.transactionWriterStates.isInnerTransaction) {
      DynamoDBORM.transactionWriterStates.writerItems.push({ Put: params });
      return putObject;
    } else {
      const createResult = await this.dynamoClient.put(params).promise();
      return { ...createResult.Attributes, ...putObject };
    }
  }

  /**
   * delete row data.
   * @param {object} filterObject is primaryKeyName and value Object.
   * @return {boolean} delete success or not
   */
  async delete(filterObject: { [s: string]: any }): Promise<boolean> {
    const params = {
      TableName: this.tableName,
      Key: filterObject,
      ReturnValues: 'ALL_OLD',
    };
    if (DynamoDBORM.transactionWriterStates.isInnerTransaction) {
      DynamoDBORM.transactionWriterStates.writerItems.push({ Delete: params });
      return true;
    } else {
      let isSuccess = true;
      await this.dynamoClient
        .delete(params)
        .promise()
        .catch((error) => (isSuccess = false));
      return isSuccess;
    }
  }

  /**
   * get all tables data.
   * @return {array[object]} all of table data.
   */
  async all(): Promise<{ [s: string]: any }> {
    const scanResult = await this.dynamoClient.scan({ TableName: this.tableName }).promise();
    return scanResult.Items as { [s: string]: any }[];
  }

  /**
   * get custom filtered row data.
   * @param {object} filterObject is filtering key name and value Object.
   * @return {DynamoDBORMRelation} method chainable class.
   */
  where(filterObject: { [s: string]: any }): DynamoDBORMRelation {
    return new DynamoDBORMRelation(this.tableName).where(filterObject);
  }

  /**
   * will return reflected offset data
   * @param {object} offsetStart is primary key and value set, starting offset pair.
   * @return {DynamoDBORMRelation} method chainable class.
   */
  offset(offsetStart: { [s: string]: any }): DynamoDBORMRelation {
    return new DynamoDBORMRelation(this.tableName).offset(offsetStart);
  }

  /**
   * get limited tables data.
   * @param {number} limitNumaber will get max data count.
   * @return {array[object]} row table data
   */
  async limit(limitNumaber: number): Promise<{ [s: string]: any }[]> {
    const scanResult = await this.dynamoClient.scan({ TableName: this.tableName, Limit: limitNumaber }).promise();
    return scanResult.Items as { [s: string]: any }[];
  }

  /**
   * get table data count.
   * @return {number} all of table data count.
   */
  async count(): Promise<number> {
    const scanResult = await this.dynamoClient.scan({ TableName: this.tableName, Select: 'COUNT' }).promise();
    return scanResult.Count;
  }

  /**
   * check data exists.
   * @param {object} filterObject is filtering key name and value Object.
   * @return {boolean} checked result, filtered data exists.
   */
  async exists(filterObject: { [s: string]: any } = {}): Promise<boolean> {
    return this.where(filterObject).exists();
  }

  async findEach(callback: (record: { [s: string]: any }) => void, start:{ [s: string]: any } = {}, batchSize: number = 1000): Promise<void>{

  }

  async findInBatches(callback: (records: { [s: string]: any }[]) => void, start:{ [s: string]: any } = {}, batchSize: number = 1000): Promise<void>{

  }

  /**
   * import data to table
   * @param {array[object]} putObjects are objects will insert to dynamodb.
   * @return {array} UnprocessedItems
   */
  async import(putObjects: { [s: string]: any }[]): Promise<any> {
    const importItems = {};
    importItems[this.tableName] = putObjects.map((putObject) => {
      return {
        PutRequest: {
          Item: putObject,
        },
      };
    });
    return await this.dynamoClient
      .batchWrite({
        RequestItems: importItems,
      })
      .promise();
  }

  /**
   * delete data from table
   * @param {array[object]} filterObjects are objects will delete rows primary key and value sets.
   * @return {array} UnprocessedItems
   */
  async deleteAll(filterObjects: { [s: string]: any }[]): Promise<any> {
    const importItems = {};
    importItems[this.tableName] = filterObjects.map((filterObject) => {
      return {
        DeleteRequest: {
          Key: filterObject,
        },
      };
    });
    return await this.dynamoClient
      .batchWrite({
        RequestItems: importItems,
      })
      .promise();
  }

  /**
   * dynamodb write transaction like begin commit or rollback
   * @param {function} inTransaction　is written in this function which will be write features.
   */
  async transaction(inTransaction: () => Promise<void>): Promise<any> {
    DynamoDBORM.transactionWriterStates.isInnerTransaction = true;
    await inTransaction();
    return await this.dynamoClient
      .transactWrite({ TransactItems: DynamoDBORM.transactionWriterStates.writerItems })
      .promise()
      .finally(() => {
        DynamoDBORM.clearTransactionState();
      });
  }

  /**
   * dynamodb write transaction like begin commit or rollback
   * @param {function} inTransaction　is written in this function which will be write features.
   */
  static async transaction(inTransaction: () => Promise<void>): Promise<any> {
    DynamoDBORM.transactionWriterStates.isInnerTransaction = true;
    await inTransaction();
    let result: any;
    if (DynamoDBORM.transactionWriterStates.writerItems.length > 0) {
      const firstItem = DynamoDBORM.transactionWriterStates.writerItems[0];
      let dynamodbOrm: DynamoDBORM;
      if (firstItem.Put) {
        dynamodbOrm = new DynamoDBORM(firstItem.Put.TableName);
      } else if (firstItem.Update) {
        dynamodbOrm = new DynamoDBORM(firstItem.Update.TableName);
      } else if (firstItem.Delete) {
        dynamodbOrm = new DynamoDBORM(firstItem.Delete.TableName);
      }
      result = await dynamodbOrm.dynamoClient.transactWrite({ TransactItems: DynamoDBORM.transactionWriterStates.writerItems }).promise();
    }
    DynamoDBORM.clearTransactionState();
    return result;
  }
}
