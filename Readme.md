# Discode

A platform to share code along with voice rooms.

Live at: http://discode.southeastasia.cloudapp.azure.com/

## Setting up dev enviornment

### Database
Create a database in your mysql server (local or remote) and get connection information as required in `.env.example` file.
Add these information to `.env` file.

For migrations, dbmate is being used. Just install dbmate(locally or in docker, whichever you prefer) then to run migrations, just do: `dbmate migrate`

### .env File
Make sure to set up other values in .env file as specified in `.env.example`

### Remaining setup
Now run `npm i` at root directory and `/frontend`

To start development server: `npm run dev`

To start frontend: `cd frontend && npm start`


## Dockerized enviornment (For deployment for now)
Update `.env` file and change `NODE_ENV` to production, all other values are available in `.env.example`
Run `docker-composer up` to build the images and start the containers.
Log into mysql `discode_mysql_1` and run:

`ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'password_you_set_in_env_file';`

`flush privileges;`

Now run migrations from `discode_backend_1` container.
