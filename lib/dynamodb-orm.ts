import { DynamoDBORMRelation } from './dynamodb-orm-relation';
import { DynamoDBORMBase } from './dynamodb-orm-base';
import { TransactionWriterStates } from './dynamodb-transaction-states';
import { TransactWriteItem } from 'aws-sdk/clients/dynamodb';

export class DynamoDBORM extends DynamoDBORMBase {

  private transactionStates: TransactionWriterStates = {
    isInnerTransaction: false,
    writerItems: [],
  };

  constructor(tableName: string) {
    super(tableName);
    this.clearTransactionState();
  }

  private clearTransactionState(): void {
    this.transactionStates = {
      isInnerTransaction: false,
      writerItems: [],
    };
  }

  /**
   * get data from primaryKeys.
   * @param {string, object} tablename and filter primaryKeys
   * @return {object} dynamodb table row object
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
   * @param {string, object} tablename and filter primaryKey
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
   * @param {string, object, object} tablename and filter primaryKeys and update obejct.
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
    const updateResult = await this.dynamoClient.update(params).promise();
    return updateResult.Attributes as { [s: string]: any };
  }

  /**
   * create new row  data.
   * @param {string, object} tablename and new obejct.
   * @return {object} created object
   */
  async create(putObject: { [s: string]: any }): Promise<{ [s: string]: any }> {
    const params = {
      TableName: this.tableName,
      Item: putObject,
      ReturnValues: 'ALL_OLD',
    };
    const createResult = await this.dynamoClient.put(params).promise();
    return { ...createResult.Attributes, ...putObject };
  }

  /**
   * delete row data.
   * @param {string, object} tablename and delete data.
   * @return {object} before delete object
   */
  async delete(filterObject: { [s: string]: any }): Promise<{ [s: string]: any }> {
    const params = {
      TableName: this.tableName,
      Key: filterObject,
      ReturnValues: 'ALL_OLD',
    };
    const deleteResult = await this.dynamoClient.delete(params).promise();
    return deleteResult.Attributes as { [s: string]: any };
  }

  /**
   * get all tables data.
   * @param {string} tablename.
   * @return {array[object]} all of table data.
   */
  async all(): Promise<{ [s: string]: any }> {
    const scanResult = await this.dynamoClient.scan({ TableName: this.tableName }).promise();
    return scanResult.Items as { [s: string]: any }[];
  }

  /**
   * get all tables data.
   * @return {array[object]} all of table data.
   */
  where(filterObject: { [s: string]: any }): DynamoDBORMRelation {
    return new DynamoDBORMRelation(this.tableName).where(filterObject);
  }

  /**
   * get all tables data.
   * @return {array[object]} all of table data.
   */
  offset(offsetStart: { [s: string]: any }): DynamoDBORMRelation {
    return new DynamoDBORMRelation(this.tableName).offset(offsetStart);
  }

  /**
   * get all tables data.
   * @return {array[object]} all of table data.
   */
  async limit(limitNumaber: number): Promise<{ [s: string]: any }[]> {
    const scanResult = await this.dynamoClient.scan({ TableName: this.tableName, Limit: limitNumaber }).promise();
    return scanResult.Items as { [s: string]: any }[];
  }

  /**
   * get all tables data.
   * @return {number} all of table data.
   */
  async count(): Promise<number> {
    const scanResult = await this.dynamoClient.scan({ TableName: this.tableName, Select: 'COUNT' }).promise();
    return scanResult.Count;
  }

  /**
   * get all tables data.
   * @return {boolean} all of table data.
   */
  async exists(filterObject: { [s: string]: any } = {}): Promise<boolean> {
    return this.where(filterObject).exists();
  }

  /**
   * import data to table
   * @param {string, object} tablename and putObjects
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
    const result = await this.dynamoClient
      .batchWrite({
        RequestItems: importItems,
      })
      .promise();
    return result;
  }

  /**
   * import data to table
   * @param {string, object} tablename and putObjects
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
    const result = await this.dynamoClient
      .batchWrite({
        RequestItems: importItems,
      })
      .promise();
    return result;
  }

  transaction(callback: (transactionOrm: DynamoDBORM) => void){
    this.transactionStates.isInnerTransaction = true;
    const transactionOrm = new DynamoDBORM(this.tableName);
    callback(transactionOrm);
    transactionOrm.executeTransaction();
    this.clearTransactionState();
  }

  private executeTransaction(): void{

  }
}
