# NodeDynamoDBORM

## DynamoDBのローカル環境での起動

```sh
docker-compose up
```

DynamoDBサーバ起動後 http://localhost:8000/shell/ にアクセスして各種設定を行う

## DynamoDBでqueryの組み方

### 参考

* [Node.jsでDynamoDBを操作するためのチートシート[* DynamoDB.DocumentClient][AWS]](https://qiita.com/Yuki_BB3/items/83198b4d9daca7ccd746)
* [Class: AWS.DynamoDB.DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)

### 参考

* [Docker（Docker Compose）から DynamoDB Local を使う際にデータを永続化する](https://qiita.com/okashoi/items/f1c757279574d37b812e)
* [DynamoDB Localを試してみる](https://dev.classmethod.jp/etc/try_dynamodb_local/)

## 【参考】

* [DynamoDBでのポイントまとめ](https://qiita.com/yoskhdia/items/6897f66bdf93017ca033)
* [DynamoDB のベストプラクティス](https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/best-practices.html)


# メモ
## queryメソッドに突っ込めるパラメータについて
https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#query-property

 * Select: 取得するデータを絞り込むことができる。 ALL_ATTRIBUTES / COUNT のどちらかしか基本的に使わない
 * ReturnConsumedCapacity: リクエストをぶっ放したら、どれくらいのCapacityを消費して処理を行なったのか取得することができる(負荷計測用) : デファオルとは NONE で INDEXESが一番詳細
 * Limit: 取得する件数を絞り込める
 * KeyConditionExpression: プライマリキー限定(ハッシュキー)、条件式を文字列で記述できるもの。
 * KeyConditionExpression: プライマリキー限定、条件式を文字列で記述できるもの。
 * ExpressionAttributeValues: 検索値のプレースホルダ。KeyConditionExpressionとともに必須パラメータ
 * ExpressionAttributeNames: 属性名(カラム名)のプレースホルダ。属性名(カラム名)にDynamoDBの予約を語を使っていなければ別にいらない。
 * FilterExpression: プライマリーキー以外の属性での検索式を組み立てたいのなら使う必要あり

参考
* [2016-02-23
AWS LambdaからDynamoDBをQueryする](https://takamints.hatenablog.jp/entry/2016/02/25/query-aws-dynamodb-by-aws-lambda-function)
* [DynamoDBの全データ削除について](https://qiita.com/HagaSpa/items/1fc831acf29dcd133b40)



https://blog.brains-tech.co.jp/entry/2015/09/30/222148#%E3%83%86%E3%83%BC%E3%83%96%E3%83%AB%E3%82%92%E3%81%BE%E3%81%A8%E3%82%81%E3%82%8B%E6%A9%9F%E8%83%BD%E3%81%8C%E3%81%AA%E3%81%84