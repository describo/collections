# #!/usr/bin/env bash

apt-get update && apt-get install -y docker

docker build --push --rm \
    -t ghcr.io/describo/describo-collections-api:latest \
    -t ghcr.io/describo/describo-collections-api:${VERSION} \
    -f Dockerfile.api-build .

docker run -it --rm \
    -v $PWD/ui:/srv/ui \
    -v ui_node_modules:/srv/ui/node_modules \
    -v $PWD/../crate-builder-component:/srv/describo \
    -w /srv/ui node:14-buster bash -l -c "npm run build"
docker build --push --rm \
    -t ghcr.io/describo/describo-collections-ui:latest \
    -t ghcr.io/describo/describo-collections-ui:${VERSION} \
    -f Dockerfile.ui-build .