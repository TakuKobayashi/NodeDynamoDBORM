import { DynamoDBORMRelation } from './dynamodb-orm-relation';
import { DynamoDBORMBase } from './dynamodb-orm-base';
import { TransactionWriterStates } from './dynamodb-transaction-states';
import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
  BatchWriteItemCommand,
  WriteRequest,
  BatchWriteItemCommandOutput,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { convertObjectToRecordStringValue, convertRecordStringValueToValue } from './dynamodb-attribute-value-converter';
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
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: convertObjectToRecordStringValue(filterObject),
    });
    const result = await this.getAndaridateDynamoDBClient().send(command);
    return convertRecordStringValueToValue(result.Item);
  }

  /**
   * search query data from primaryKey.
   * @param {object} filterObject is primaryKeyName and value Object.
   * @return {array[object]} dynamodb table row objects
   */
  async findByAll(filterObject: { [s: string]: any }): Promise<{ [s: string]: any }[]> {
    const filterQueryExpressions = await this.generateFilterQueryExpression(filterObject);
    const command = new QueryCommand({
      TableName: this.tableName,
      ...filterQueryExpressions,
    });
    const queryResult = await this.getAndaridateDynamoDBClient().send(command);
    return queryResult.Items.map((item) => convertRecordStringValueToValue(item));
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
    const commandInput = {
      TableName: this.tableName,
      Key: convertObjectToRecordStringValue(filterObject),
      UpdateExpression: updateExpressionString,
      ExpressionAttributeValues: updateExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    if (DynamoDBORM.transactionWriterStates.isInnerTransaction) {
      DynamoDBORM.transactionWriterStates.writerItems.push({ Update: commandInput });
      return updateObject;
    } else {
      const updateResult = await this.getAndaridateDynamoDBClient().send(new UpdateItemCommand(commandInput));
      return updateResult.Attributes;
    }
  }

  /**
   * create new row  data.
   * @param {object} putObject is a object inserting to dynamodb.
   * @return {object} created object
   */
  async create(putObject: { [s: string]: any }): Promise<{ [s: string]: any }> {
    const commandInput = {
      TableName: this.tableName,
      Item: convertObjectToRecordStringValue(putObject),
      ReturnValues: 'ALL_OLD',
    };
    if (DynamoDBORM.transactionWriterStates.isInnerTransaction) {
      DynamoDBORM.transactionWriterStates.writerItems.push({ Put: commandInput });
      return putObject;
    } else {
      const createResult = await this.getAndaridateDynamoDBClient().send(new PutItemCommand(commandInput));
      return { ...createResult.Attributes, ...putObject };
    }
  }

  /**
   * delete row data.
   * @param {object} filterObject is primaryKeyName and value Object.
   * @return {boolean} delete success or not
   */
  async delete(filterObject: { [s: string]: any }): Promise<boolean> {
    const commandInput = {
      TableName: this.tableName,
      Key: convertObjectToRecordStringValue(filterObject),
      ReturnValues: 'ALL_OLD',
    };
    if (DynamoDBORM.transactionWriterStates.isInnerTransaction) {
      DynamoDBORM.transactionWriterStates.writerItems.push({ Delete: commandInput });
      return true;
    } else {
      let isSuccess = true;
      await this.getAndaridateDynamoDBClient()
        .send(new DeleteItemCommand(commandInput))
        .catch((error) => (isSuccess = false));
      return isSuccess;
    }
  }

  /**
   * get all tables data.
   * @return {array[object]} all of table data.
   */
  async all(): Promise<{ [s: string]: any }[]> {
    const command = new ScanCommand({ TableName: this.tableName });
    const scanResult = await this.getAndaridateDynamoDBClient().send(command);
    return scanResult.Items.map((item) => convertRecordStringValueToValue(item));
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
    const command = new ScanCommand({ TableName: this.tableName, Limit: limitNumaber });
    const scanResult = await this.getAndaridateDynamoDBClient().send(command);
    return scanResult.Items.map((item) => convertRecordStringValueToValue(item));
  }

  /**
   * get table data count.
   * @return {number} all of table data count.
   */
  async count(): Promise<number> {
    const command = new ScanCommand({ TableName: this.tableName, Select: 'COUNT' });
    const scanResult = await this.getAndaridateDynamoDBClient().send(command);
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

  /**
   * import data to table
   * @param {array[object]} putObjects are objects will insert to dynamodb.
   * @return {array} UnprocessedItems
   */
  async import(putObjects: { [s: string]: any }[]): Promise<BatchWriteItemCommandOutput> {
    const requests: WriteRequest[] = [];
    for (const putObject of putObjects) {
      requests.push({
        PutRequest: {
          Item: convertObjectToRecordStringValue(putObject),
        },
      });
    }
    const importItems: Record<string, WriteRequest[]> = {};
    importItems[this.tableName] = requests;
    const command = new BatchWriteItemCommand({
      RequestItems: importItems,
    });
    return this.getAndaridateDynamoDBClient().send(command);
  }

  /**
   * delete data from table
   * @param {array[object]} deleteObjects are objects will delete rows primary key and value sets.
   * @return {array} UnprocessedItems
   */
  async deleteAll(deleteObjects: { [s: string]: any }[]): Promise<any> {
    const requests: WriteRequest[] = [];
    for (const deleteObject of deleteObjects) {
      requests.push({
        DeleteRequest: {
          Key: convertObjectToRecordStringValue(deleteObject),
        },
      });
    }
    const importItems = {};
    importItems[this.tableName] = requests;
    const command = new BatchWriteItemCommand({
      RequestItems: importItems,
    });
    return await this.getAndaridateDynamoDBClient().send(command);
  }

  /**
   * dynamodb write transaction like begin commit or rollback
   * @param {function} inTransaction　is written in this function which will be write features.
   */
  async transaction(inTransaction: () => Promise<void>): Promise<any> {
    DynamoDBORM.transactionWriterStates.isInnerTransaction = true;
    await inTransaction();
    const command = new TransactWriteItemsCommand({
      TransactItems: DynamoDBORM.transactionWriterStates.writerItems,
    });
    return this.getAndaridateDynamoDBClient()
      .send(command)
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
    const command = new TransactWriteItemsCommand({
      TransactItems: DynamoDBORM.transactionWriterStates.writerItems,
    });
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
      result = await dynamodbOrm.getAndaridateDynamoDBClient().send(command);
    }
    DynamoDBORM.clearTransactionState();
    return result;
  }
}
