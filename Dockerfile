FROM amazon/dynamodb-local

WORKDIR /home/dynamodblocal

# UID=1000 → DynamoDB Local の実行ユーザ
RUN mkdir data && chown -R 1000 data