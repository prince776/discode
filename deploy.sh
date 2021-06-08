#!/bin/bash

cp .env.production .env
docker-compose up --build -d
docker exec -it discode_backend_1 dbmate migrate
