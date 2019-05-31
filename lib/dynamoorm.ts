const AWS = require('aws-sdk');
let dynamoClient = new AWS.DynamoDB.DocumentClient();

export interface AWSConfigSettings {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export class DynamoORM {
  constructor() {
    dynamoClient = new AWS.DynamoDB.DocumentClient();
  }

  static updateConfig(config: AWSConfigSettings) {
    AWS.config.update(config);
    dynamoClient = AWS.DynamoDB.DocumentClient();
  }

  async findBy<T>(tablename: string, filterObject): Promise<T> {
    const params = {
      TableName: tablename,
      Key: filterObject,
    };
    return dynamoClient.get(params).promise() as Promise<T>;
  }

  async findByAll<T>(tablename: string, filterObject: { [s: string]: any }): Promise<T[]> {
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
    return dynamoClient.query(params).promise() as Promise<T[]>;
  }

  async update(tablename: string, filterObject: { [s: string]: any }, updateObject: { [s: string]: any }) {
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
      ReturnValues: 'UPDATED_NEW',
    };
    return dynamoClient.update(params).promise();
  }

  async create(tablename: string, putObject: { [s: string]: any }) {
    const params = {
      TableName: tablename,
      Item: putObject,
    };
    return dynamoClient.put(params).promise();
  }

  async delete(tablename: string, filterObject: { [s: string]: any }) {
    const params = {
      TableName: tablename,
      Key: filterObject,
    };
    return dynamoClient.delete(params).promise();
  }

  async all<T>(tablename): Promise<T[]> {
    return dynamoClient.scan({ TableName: tablename }).promise() as Promise<T[]>;
  }

  where(tablename, filterObjects): DynamoORMRelation {
    const relation = new DynamoORMRelation();
    return relation.where(tablename, filterObjects);
  }
}

class DynamoORMRelation {
  private batchTableFilter: { [s: string]: any } = {};

  constructor() {
    dynamoClient = new AWS.DynamoDB.DocumentClient();
    this.clear();
  }

  where(tablename, filterObjects): DynamoORMRelation {
    if (!this.batchTableFilter[tablename]) {
      this.batchTableFilter[tablename] = {};
    }
    const filterObjectKeys = Object.keys(filterObjects);
    for (const filterObjectKey of filterObjectKeys) {
      if (!this.batchTableFilter[tablename][filterObjectKey]) {
        this.batchTableFilter[tablename][filterObjectKey] = [];
      }
      const values = [].concat.apply([], [filterObjects[filterObjectKey]]);
      const filterValues = this.batchTableFilter[tablename][filterObjectKey].concat(values);
      this.batchTableFilter[tablename][filterObjectKey] = filterValues.filter((elem, index, self) => self.indexOf(elem) == index);
    }
    return this;
  }

  async load() {
    const requestItems = {};
    for (const tableName of Object.keys(this.batchTableFilter)) {
      const keyValuesObject = this.batchTableFilter[tableName];
      const dynamoFilterKeys = [];
      const filterObjectKeys = Object.keys(keyValuesObject);
      for (const filterObjectKey of filterObjectKeys) {
        const dynamoFilterObject = {};
        for (const filterObjectValue of keyValuesObject[filterObjectKey]) {
          dynamoFilterObject[filterObjectKey] = filterObjectValue;
          dynamoFilterKeys.push(dynamoFilterObject);
        }
      }
      requestItems[tableName] = {
        Keys: dynamoFilterKeys,
      };
    }
    const params = {
      RequestItems: requestItems,
    };
    this.clear();
    return dynamoClient.batchGet(params).promise();
  }

  clear() {
    this.batchTableFilter = {};
  }
}
