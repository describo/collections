# DB migrations

Be sure to execute these commands **inside** the API container

## Creating a new migration

```
npx sequelize-cli migration:generate --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name {description-name-for-migration}
```

# Running all migrations

```
npx sequelize-cli db:migrate --config ./src/models/config.cjs --migrations-path ./src/models/migrations
```

## Running a specific migration

```
npx sequelize-cli db:migrate --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name {migration-file.js}
```

Note: The name must be the name of the migration file; ie without the path

## Undoing all migrations

```
npx sequelize-cli db:migrate:undo --config ./src/models/config.cjs --migrations-path ./src/models/migrations
```

## Undoing a specific migration

```
npx sequelize-cli db:migrate:undo --config ./src/models/config.cjs --migrations-path ./src/models/migrations --name {migration-file.js}
```

Note: The name must be the name as found in the "SequelizeMeta" table; ie the name of the file
without the path.
