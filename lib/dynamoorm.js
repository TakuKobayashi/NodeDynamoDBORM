const AWS = require('aws-sdk');
let dynamoClient = new AWS.DynamoDB.DocumentClient();

module.exports = class DynamoORM {
  constructor() {
    dynamoClient = new AWS.DynamoDB.DocumentClient();
  }

  static updateConfig(config = {}){
    AWS.config.update(config);
    dynamoClient = AWS.DynamoDB.DocumentClient();
  }

  async findBy(tablename, filterObject) {
    const params = {
      TableName: tablename,
      Key: filterObject
    };
    return dynamoClient.get(params).promise();
  };

  async findByAll(tablename, filterObject) {
    const keyNames = Object.keys(filterObject);
    const keyConditionExpression = keyNames.map(keyName => "#" + keyName + " = " + ":" + keyName).join(" AND ");
    const expressionAttributeNames = {}
    const expressionAttributeValues = {}
    for (const keyName of keyNames) {
      expressionAttributeNames["#" + keyName] = keyName;
      expressionAttributeValues[":" + keyName] = filterObject[keyName];
    }
    const params = {
      TableName: tablename,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };
    return dynamoClient.query(params).promise();
  };

  async update(tablename, filterObject, updateObject) {
    const updateExpressionString = "set ";
    const updateExpressionAttributeValues = {}
    const keys = Object.keys(updateObject);
    for (let i = 0; i < keys.length; ++i) {
      const praceholder = ":Attr" + i.toString();
      updateExpressionString = updateExpressionString + keys[i] + " = " + praceholder;
      if (i !== keys.length - 1) {
        updateExpressionString = updateExpressionString + ", ";
      }
      updateExpressionAttributeValues[praceholder] = updateObject[keys[i]];
    }
    const params = {
      TableName: tablename,
      Key: filterObject,
      UpdateExpression: updateExpressionString,
      ExpressionAttributeValues: updateExpressionAttributeValues,
      ReturnValues: "UPDATED_NEW"
    };
    return dynamoClient.update(params).promise();
  };

  async create(tablename, putObject) {
    const params = {
      TableName: tablename,
      Item: putObject
    };
    return dynamoClient.put(params).promise();
  };

  async delete(tablename, filterObject) {
    const params = {
      TableName: tablename,
      Key: filterObject,
    };
    return dynamoClient.delete(params).promise();
  };

  async delete(tablename, filterObject) {
    const params = {
      TableName: tablename,
      Key: filterObject,
    };
    return dynamoClient.delete(params).promise();
  };

  async all(tablename){
    return dynamoClient.scan({TableName: tablename}).promise();
  }

  where(tablename, filterObjects) {
    const relation = new DynamoORMRelation();
    return relation.where(tablename, filterObjects);
  }
}

class DynamoORMRelation{
  constructor() {
    dynamoClient = new AWS.DynamoDB.DocumentClient();
    this.clear();
  }

  where(tablename, filterObjects) {
    if(!batchTableFilter[tablename]){
      batchTableFilter[tablename] = {}
    }
    const filterObjectKeys = Object.keys(filterObjects);
    for(const filterObjectKey of filterObjectKeys){
      if(!batchTableFilter[tablename][filterObjectKey]){
        batchTableFilter[tablename][filterObjectKey] = []
      }
      const values = [].concat.apply([], [filterObjects[filterObjectKey]]);
      const filterValues = batchTableFilter[tablename][filterObjectKey].concat(values)
      batchTableFilter[tablename][filterObjectKey] = filterValues.filter((elem, index, self) => self.indexOf(elem) == index);
    }
    return this;
  }

  async load(){
    const requestItems = {}
    for(const tableName of Object.keys(this.batchTableFilter)){
      const keyValuesObject = batchTableFilter[tableName];
      const dynamoFilterKeys = []
      const filterObjectKeys = Object.keys(keyValuesObject);
      for(const filterObjectKey of filterObjectKeys){
        const dynamoFilterObject = {}
        for(const filterObjectValue of keyValuesObject[filterObjectKey]){
          dynamoFilterObject[filterObjectKey] = filterObjectValue
          dynamoFilterKeys.push(dynamoFilterObject);
        }
      }
      requestItems[tablename] = {
        Keys: dynamoFilterKeys,
      };
    }
    const params = {
      RequestItems: requestItems,
    }
    this.clear();
    return dynamoClient.batchGet(params).promise();
  }

  clear(){
    this.batchTableFilter = {}
  }
}