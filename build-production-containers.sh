# #!/usr/bin/env bash

# \sudo apt-get update && \sudo apt-get install -y docker.io

VERSION=$(grep version api/package.json | awk -F ': ' '{ print $2 }' | sed 's/"//g' | sed 's/,//' )

docker build --push --rm \
    -t ghcr.io/describo/describo-collections-api:latest \
    -t ghcr.io/describo/describo-collections-api:${VERSION} \
    -f Dockerfile.api-build .

cd ui
npm run build

cd -
docker build --push --rm \
    -t ghcr.io/describo/describo-collections-ui:latest \
    -t ghcr.io/describo/describo-collections-ui:${VERSION} \
    -f Dockerfile.ui-build .