import DynamoDBORM from './dynamodb-orm';

export default class DynamoDBORMTransaction extends DynamoDBORM {

  /**
   * update row data.
   * @param {string, object, object} tablename and filter primaryKeys and update obejct.
   * @return {object} updated object
   */
  async update(filterObject: { [s: string]: any }, updateObject: { [s: string]: any }): Promise<Map<string, any>> {
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
    return updateResult.Attributes as Map<string, any>;
  }

  /**
   * create new row  data.
   * @param {string, object} tablename and new obejct.
   * @return {object} created object
   */
  async create(putObject: { [s: string]: any }): Promise<Map<string, any>> {
    const params = {
      TableName: this.tableName,
      Item: putObject,
      ReturnValues: 'ALL_OLD',
    };
    const createResult = await this.dynamoClient.put(params).promise();
    return { ...createResult.Attributes, ...putObject } as Map<string, any>;
  }

  /**
   * delete row data.
   * @param {string, object} tablename and delete data.
   * @return {object} before delete object
   */
  async delete(filterObject: { [s: string]: any }): Promise<Map<string, any>> {
    const params = {
      TableName: this.tableName,
      Key: filterObject,
      ReturnValues: 'ALL_OLD',
    };
    const deleteResult = await this.dynamoClient.delete(params).promise();
    return deleteResult.Attributes as Map<string, any>;
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

  async execute(){

  }
}
