import DynamoDBORMRelation from './dynamodb-orm-relation'
import DynamoDBORMBase from './dynamodb-orm-base'

export default class DynamoDBORM extends DynamoDBORMBase {
  /**
   * get data from primaryKeys.
   * @param {string, object} tablename and filter primaryKeys
   * @return {object} dynamodb table row object
   */
  async findBy(tablename: string, filterObject: { [s: string]: any }): Promise<Map<string, any>> {
    const params = {
      TableName: tablename,
      Key: filterObject,
    };
    const result = await this.dynamoClient.get(params).promise();
    return result.Item as Map<string, any>;
  }

  /**
   * search query data from primaryKey.
   * @param {string, object} tablename and filter primaryKey
   * @return {array[object]} dynamodb table row objects
   */
  async findByAll(tablename: string, filterObject: { [s: string]: any }): Promise<Map<string, any>[]> {
    const keyNames = Object.keys(filterObject);
    const keyConditionExpression = keyNames.map((keyName) => '#' + keyName + ' = ' + ':' + keyName).join(' AND ');
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};
    for (const keyName of keyNames) {
      expressionAttributeNames['#' + keyName] = keyName;
      expressionAttributeValues[':' + keyName] = filterObject[keyName];
    }
    const params = {
      TableName: tablename,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };
    const queryResult = await this.dynamoClient.query(params).promise();
    return queryResult.Items as Map<string, any>[];
  }

  /**
   * update row data.
   * @param {string, object, object} tablename and filter primaryKeys and update obejct.
   * @return {object} updated object
   */
  async update(tablename: string, filterObject: { [s: string]: any }, updateObject: { [s: string]: any }): Promise<Map<string, any>> {
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
      TableName: tablename,
      Key: filterObject,
      UpdateExpression: updateExpressionString,
      ExpressionAttributeValues: updateExpressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    };
    const updateResult = await this.dynamoClient.update(params).promise();
    return updateResult.Attributes as Map<string, any>;
  }

  /**
   * create new row  data.
   * @param {string, object} tablename and new obejct.
   * @return {object} created object
   */
  async create(tablename: string, putObject: { [s: string]: any }): Promise<Map<string, any>> {
    const params = {
      TableName: tablename,
      Item: putObject,
      ReturnValues: 'ALL_OLD',
    };
    const createResult = await this.dynamoClient.put(params).promise();
    return Object.assign(createResult.Attributes, putObject) as Map<string, any>;
  }

  /**
   * delete row data.
   * @param {string, object} tablename and delete data.
   * @return {object} before delete object
   */
  async delete(tablename: string, filterObject: { [s: string]: any }): Promise<Map<string, any>> {
    const params = {
      TableName: tablename,
      Key: filterObject,
      ReturnValues: 'ALL_OLD',
    };
    const deleteResult = await this.dynamoClient.delete(params).promise();
    return deleteResult.Attributes as Map<string, any>;
  }

  /**
   * get all tables data.
   * @param {string} tablename.
   * @return {array[object]} all of table data.
   */
  async all(tablename): Promise<Map<string, any>[]> {
    const scanResult = await this.dynamoClient.scan({ TableName: tablename }).promise();
    return scanResult.Items as Map<string, any>[];
  }

  /**
   * get all tables data.
   * @param {string} tablename.
   * @return {array[object]} all of table data.
   */
  async count(tablename): Promise<Number> {
    const scanResult = await this.dynamoClient.scan({ TableName: tablename }).promise();
    return scanResult.Count;
  }

  /**
   * get all tables data.
   * @param {string} tablename.
   * @return {array[object]} all of table data.
   */
  async executeRows(methodName: string, params: { [s: string]: any }): Promise<any> {
    return this.dynamoClient[methodName](params).promise();
  }

  /**
   * import data to table
   * @param {string, object} tablename and putObjects
   * @return {array} UnprocessedItems
   */
  async import(tablename: string, putObjects: { [s: string]: any }[]): Promise<Map<string, any>[]> {
    const importItems = {};
    importItems[tablename] = putObjects.map((putObject) => {
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
    return result.UnprocessedItems as Map<string, any>[];
  }

  /**
   * import data to table
   * @param {string, object} tablename and putObjects
   * @return {array} UnprocessedItems
   */
  async deleteAll(tablename: string, filterObjects: { [s: string]: any }[]): Promise<Map<string, any>[]> {
    const importItems = {};
    importItems[tablename] = filterObjects.map((filterObject) => {
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
    return result.UnprocessedItems as Map<string, any>[];
  }
}
