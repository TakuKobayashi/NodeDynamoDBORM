[NodeDynamoDBORM](https://github.com/TakuKobayashi/NodeDynamoDBORM) という`DynamoDB`で`Rails`の`ActiveRecord`のように使うことができる`Node.js`ライブラリを作成しましたので紹介します。
よかったら、使ってください。またスターもください。
プルリクやご要望もお待ちしています。
`DynamoDB`については後ろの方に紹介しているのでそちらもご覧ください。

## イントロダクション

### インストール

```sh
npm install node-dynamodb-orm --save
```

または、`yarn`を使う場合は

```sh
yarn add node-dynamodb-orm
```

でインストールします。

### 特徴

`Rails`の`ActiveRecord`の使用感に合わせた形で作成しました。`ActiveRecord`と大体同じ感覚で使え、`ActiveRecord`の機能をできるだけ再現できるように作りました。

### なぜ作った?

公式の[aws-sdk](https://github.com/aws/aws-sdk-js)がすごく使いにくい!!

[aws-sdk](https://github.com/aws/aws-sdk-js) を使って`DynamoDB`を操作する開発に限界を感じ、使いやすい ORM も存在しなかったため作成しました。(共通の悩みを持っている人も多くいるようです(参考を参照))
機能の追加希望などの意見がありましたら教えてください。プルリクもお待ちしています。

#### 参考

- [Node.js で DynamoDB を操作するためのチートシート[DynamoDB.DocumentClient][AWS]](https://qiita.com/Yuki_BB3/items/83198b4d9daca7ccd746)

## DynamoDB を使う

### ローカル環境での開発環境の構築

プロジェクト([NodeDynamoDBORM](https://github.com/TakuKobayashi/NodeDynamoDBORM))の中では`DynamoDB`の環境を`Docker`を用いてローカル環境を構築し、[Jest](https://jestjs.io/ja/)でテストを記述しています。
上記プロジェクトをダウンロード後、

```sh
docker-compose up
```

と実行することで`DynamoDB`のローカルサーバーが起動します。
サーバーが起動した後 http://localhost:8000/shell/ にアクセスすることで`DynamoDB`の`Javascript Console`が開くので、こちらでいろいろと試すことができます。

#### 参考

- [ローカルで Lambda のテストをする環境を作ったメモ](https://qiita.com/Yuki_BB3/items/939dd94fc8c1857fc824)

### AWS コンソールから DynamoDB を使う

1.  AWS コンソールから DynamoDB を選択することで各種設定を行うことができます。
2.  初めてならば、とりあえずテーブルを作成していくことで使用できます。
    <img width="1370" alt="DynamoDBCreateTable.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/72596/9dc01884-8bfb-41e3-c604-e8072a91e425.png">
3.  外部から DynamoDB にアクセスするためには[IAM](https://aws.amazon.com/jp/iam/)にて DynamoDB へのアクセス権限を付与し、付与したアカウントの `accessKey` と `secretAccessKey` を取得します。

<img width="1368" alt="DynamoDBFullAccess.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/72596/9fe4825e-71ba-4259-dd13-2a5161e9acab.png">

上記のように DynamoDB にアクセスすることができるアカウントの`accessKeyId`と`secretAccessKey`を用いることで、AWS コンソール上に作った DynamoDB の操作ができるようになります。
また AWS コンソールからだけでなく`aws-cli`を用いて`cli`からの操作も可能です。その場合は上記[IAM](https://aws.amazon.com/jp/iam/)にて取得した、`accessKeyId`、`secretAccessKey` を用いることで DynamoDB にアクセスすることができます。

## Node.js での使い方

### import/require

使用するためには以下のように読み込みます。

```typescript
const { DynamoDBORM } = require("node-dynamodb-orm");
```

または `TypeScript` など `import` が使用できる場面では

```typescript
import { DynamoDBORM } from 'node-dynamodb-orm';
```

これで宣言できます。

### 接続情報の設定

読み込んだら、`DynamoDB` に接続するための接続情報を設定します。
`process.env`内に以下に指定した値を設定されていれば自動的に読み込んで接続することもできます。そのため、[dotenv](https://github.com/motdotla/dotenv)を用いて`.env`ファイルに記載した場合その設定が接続に反映されます。

#### .env への記述の仕方

接続情報の例を以下に示します。

```.env
region=DynamoDB's AWS Region
endpoint=endpoint (ローカルなら http://localhost:8000 それ以外はなくてもOK)
accessKeyId=xxxxx
secretAccessKey=xxxxxxxxxx
```

`region`は必須です。
ローカルの DynamoDB に接続したい場合は`endpoint`を指定して下さい。

```
accessKeyId=xxxxx
secretAccessKey=xxxxxxxxxx
```

は、上記 AWS コンソールでの設定にて、DynamoDB へのアクセスが可能な権限を持った`accessKeyId`と`secretAccessKey`をそれぞれ使用することで使用することができます。

#### 接続情報を直接指定する場合

ソースコードの中で直接指定することもできます。その場合は以下のように指定します。

```typescript
DynamoDBORM.updateConfig({ region: 'ap-northeast-1', endpoint: new AWS.Endpoint('http://localhost:8000') });
```

この場合、ローカルの DynamoDB へのアクセスとなります。
`accessKeyId`と`secretAccessKey`を用いた場合は以下のようになります。

```typescript
DynamoDBORM.updateConfig({ region: 'ap-northeast-1', accessKeyId: 'accessKeyId', secretAccessKey: 'secretAccessKey' });
```

#### Node.js から呼び出す

今回、以下のような`users`テーブルがすでに作成されているとします。

| 項目                                     | 値      |
| ---------------------------------------- | ------- |
| テーブル名                               | users   |
| プライマリキー(ハッシュキー)             | user_id |
| プライマリキー(ハッシュキー)のデータ種別 | 文字列  |

また `users` の持ち物として `items` テーブルが以下のように定義され、すでに作成されているとします。 また `items` テーブルは `users` テーブルと依存関係にあります。

| 項目                                     | 値          |
| ---------------------------------------- | ----------- |
| テーブル名                               | items       |
| プライマリキー(ハッシュキー)             | user_id     |
| プライマリキー(ハッシュキー)のデータ種別 | 文字列      |
| プライマリキー(レンジキー)               | mst_item_id |
| プライマリキー(レンジキー)のデータ種別   | 文字列      |

これらのテーブルを用いた操作の例を以下に紹介していきます。

- ハッシュキー = パーティションキー
- レンジキー = ソートキー

ともいいます。

### New

まずはテーブル名を引数にインスタンスを作成します。

```typescript
const usersTable = new DynamoDBORM('users');
```

### CRUD

#### Create

テーブルにデータを追加

```typescript
const user = await usersTable.create({ user_id: 'user_id', name: 'sample' });
```

テーブル内のデータは以下のようになります。

| user_id | name   |
| ------- | ------ |
| user_id | sample |

#### Update

テーブル内のデータを更新

```typescript
const user = await usersTable.update({ user_id: 'user_id' }, { email: 'xxxx', name: 'sample2' });
```

テーブル内のデータは以下のようになります。

| user_id | name    | email |
| ------- | ------- | ----- |
| user_id | sample2 | xxxx  |

<font color="#FF0000">※ DynamoDB ではプライマリキーのデータの更新はできないので注意してください</font>

#### Read

テーブル内からデータを取得

```typescript
const user = await usersTable.findBy({ user_id: 'user_id' });
//user => {user_id: "user_id", name: "sample2", email: "xxxx"}
```

<font color="#FF0000">※ この時、プライマリキーを指定しなければなりません。指定しなかった場合はエラーになります</font>

#### Delete

テーブル内からデータを削除

```typescript
const user = await usersTable.delete({ user_id: 'user_id' });
```

テーブル内のデータは以下のようになります。

| user_id | name | email |
| ------- | ---- | ----- |


### 一括操作系

ここでは `items` テーブルへの操作例を紹介します。

```typescript
const itemsTable = new DynamoDBORM('items');
```

#### データの一括追加

テーブルに複数件のデータを追加するには以下のようになります。

```typescript
const items = await itemsTable.import([
  { user_id: 'user_id1', mst_item_id: 1, amount: 1 },
  { user_id: 'user_id1', mst_item_id: 2, amount: 2 },
  { user_id: 'user_id2', mst_item_id: 2, amount: 2 },
]);
```

`items` テーブル内のデータは以下のようになります。

| user_id  | mst_item_id | amount |
| -------- | ----------- | ------ |
| user_id1 | 1           | 1      |
| user_id1 | 2           | 2      |
| user_id2 | 2           | 2      |

#### 複数のデータを取得

テーブル内から複数のデータを取得

```typescript
const items = await itemsTable.findByAll({ user_id: 'user_id1' });
//=> [{ user_id: 'user_id1', mst_item_id: 1, amount: 1 },{ user_id: 'user_id1', mst_item_id: 2, amount: 2 }]
```

または `where` を使って同様のこともできます。

```typescript
const items = await itemsTable.where({ user_id: 'user_id1' }).load();
//=> [{ user_id: 'user_id1', mst_item_id: 1, amount: 1 },{ user_id: 'user_id1', mst_item_id: 2, amount: 2 }]
```

`load()` を実行しないとデータを取得できないので、注意です。

#### テーブル内のデータ全件を取得したい

テーブル内に含まれているデータを全て取得することもできます。

```typescript
const items = await itemsTable.all();
//=> [{ user_id: 'user_id1', mst_item_id: 1, amount: 1 },{ user_id: 'user_id1', mst_item_id: 2, amount: 2 },{ user_id: 'user_id', mst_item_id: 2, amount: 2 }]
```

#### ページングしたい

`DynamoDB` では `Query`(`findByAll`, `where`で使用) で取得できるデータは `1MB` までです。

途中までしか取得できなかったデータを取得するためには取得できなかった先の情報にアクセスできる必要があります。そのような場合は`offset` を指定することでデータを取得することができます。

```typescript
const items = await itemsTable.offset({ user_id: 'user_id1', mst_item_id: 2 }).load();
//=> [{ user_id: 'user_id', mst_item_id: 2, amount: 2 }]
```

`DynamoDB` の仕様上 `offset` として指定できるのは `プライマリキー` の組み合わせを指定します。

##### 参考

- [DynamoDB での制限](https://docs.aws.amazon.com/ja_jp/amazondynamodb/latest/developerguide/Limits.html)

#### 一括データ削除

テーブル内から複数のデータを削除

```typescript
const items = await itemsTable.deleteAll([{ user_id: 'user_id1', mst_item_id: 1 }, { user_id: 'user_id1', mst_item_id: 2 }]);
```

`items` テーブル内のデータは以下のようになります。

| user_id  | mst_item_id | amount |
| -------- | ----------- | ------ |
| user_id2 | 2           | 2      |

#### あれ?なんか一部 ActiveRecrod と違くない?

扱っている相手が DynamoDB なので、そこは少し仕様が異なります

### もう少し使っている感じをイメージしたい

[Jest](https://jestjs.io/ja/) でテストを記述してあります。[こちら](https://github.com/TakuKobayashi/NodeDynamoDBORM/tree/master/test)を参照した方が使い方のイメージがつかみやすいかもしれません。そのほかの機能についても記述しています。

## DynamoDB の基礎知識

そもそもとして、`DynamoDB`を扱う上での基礎知識や特徴、仕様について以下に紹介します。

### DynamoDB の魅力

- <font color="#FF0000">安価(無料)で利用できる NoSQL データベース!!</font>
- オートスケールもしてくれる → 高負荷にも強い
- 大規模データの保存/ハッシュキーによるデータの取得が高速
- カラムを追加する必要がない

### DynamoDB デメリット

- <font color="#FF0000">検索するときはプライマリキー(ハッシュキー)を指定しなければならない</font>
- 複雑な操作はできない(ソートとか JOIN とか GROUPING とか)
- バリデーションが弱い(例: プライマリキーが重複したものを追加しようとすると、エラーが起こらず、そのデータが「更新」される)

### DynamoDB の特性・仕様の解説

`DynamoDB`は根本的には [KVS](http://e-words.jp/w/KVS.html) の [NoSQL](https://ja.wikipedia.org/wiki/NoSQL) データベースです。<font color="#FF000">そのため、RDB と同じ考え方操作することができません。また、RDB の考え方でデータ構造を作ると苦労するので気をつけてください。</font>

#### 1. 複合プライマリキーとして設定できるキーは 2 種類まで

複合プライマリキー(ハッシュキーとレンジキー)として設定できるキーは 2 種類までであるので、データベースの正規化を行う場合は制約がかかります。
上記の`items`テーブルがその例で、上記以上のリレーションを構築することは`DynamoDB`ではできません。そのため、データ構造はよく考えて構築する必要があります。

#### 2. AUTO INCREMENT なんてものは存在しない

プライマリキーとして指定した Key は重複してはならない値になります。`MySQL`などには自動で重複しない値を設定してくれる`AUTO INCREMENT`属性がありますが、`DynamoDB` にはそのようなものはありません。そのため、[uuid(https://github.com/kelektiv/node-uuid) などを使い、以下のように自力で重複しない値を生成する必要があります。

```typescript
const uuid = require('uuid/v4');
uuid();
```

#### 3. 検索する時はプライマリキー(ハッシュキー)の指定が必須

例えば`MySQL`では上記の`items` テーブルのようなデータの場合

```SQL
SELECT * FROM items WHERE mst_item_id = 2;
```

のようにレンジキーのみを指定したり

```SQL
SELECT * FROM items WHERE amount = 2;
```

他のカラムのみを検索条件に指定して SQL で検索することができます。

<font color="#FF0000">しかし、DynamoDB ではハッシュキーである `user_id` が等価であることを指定した上で他の条件を入力しなければエラーになってしまいます。</font>

以上のように`DynamoDB`は RDB と性質が異なるデータベースであるため。用途に合わせるか使い方を工夫して使用する必要があります

### 参考

- [DynamoDB でのポイントまとめ](https://qiita.com/yoskhdia/items/6897f66bdf93017ca033)

## 今後実装予定の機能について

### 四則演算、前方一致

実装予定の使用例

```typescript
const itemsTable = new DynamoDBORM('items');
const items = await itemsTable.where('amount < 2').load();
```

### トランザクション

実装予定の使用例

```typescript
const itemsTable = new DynamoDBORM('items');
itemsTable.transaction(() => {
  // 何か処理を書く
});
```

### find_each, find_in_batches

実装予定の使用例

```typescript
const itemsTable = new DynamoDBORM('items');
itemsTable.findEach((item) => {
  // 何か処理を書く
});
```

いずれも現在、ブランチを作成して機能を作成しています。作成までしばしお待ちを。

## 最後に

ぜひ使ってみてください。
また、バグとかありましたらご報告いただけると幸いです。(プルリクだとなお嬉しい)
