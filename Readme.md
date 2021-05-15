# Discode

A platform to share code along with voice rooms.

## Setting up dev enviornment

### Database
Create a database in your mysql server (local or remote) and get connection information as required in `.env.example` file.
Add these information to `.env` file.

For migrations, dbmate is being used. Just install dbmate(locally or in docker, whichever you prefer) then to run migrations, just do: `dbmate migrate`

### .env File
Make sure to set up other values in .env file as specified in `.env.example`

### Remaining setup
Now go to root directory and run `npm i`.

To start development server: `npm run dev`
