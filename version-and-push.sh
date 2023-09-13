#!/usr/bin/env bash

if [ "$#" != "1" ] ; then
    echo "Usage: $0 [minor | patch]"
    exit -1
fi

if [[ $1 != 'minor'  && $1 != 'patch' ]] ; then
    echo "Usage: $0 [minor | patch]"
    exit -1
fi
    cd api
    version=$(npm version --no-git-tag-version $1)
    cd ../ui
    npm version --no-git-tag-version $version
    cd ..
    git tag $version
    git commit -a -m "tag and bump version"


# read -p '>> Build the containers and push to docker hub? [y|N] ' resp
# if [ "$resp" == "y" ] ; then
#     docker build --push --rm \
#         -t ghcr.io/describo/describo-collections-api:latest \
#         -t ghcr.io/describo/describo-collections-api:${VERSION} \
#         -f Dockerfile.api-build .

#     docker run -it --rm \
#         -v $PWD/ui:/srv/ui \
#         -v ui_node_modules:/srv/ui/node_modules \
#         -v $PWD/../crate-builder-component:/srv/describo \
#         -w /srv/ui node:14-buster bash -l -c "npm run build"
#     docker build --push --rm \
#         -t ghcr.io/describo/describo-collections-ui:latest \
#         -t ghcr.io/describo/describo-collections-ui:${VERSION} \
#         -f Dockerfile.ui-build .
# fi