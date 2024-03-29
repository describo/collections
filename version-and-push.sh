#!/usr/bin/env bash

if [ "$#" != "1" ] ; then
    echo "Usage: $0 [minor | patch]"
    exit -1
fi

if [[ $1 != 'minor'  && $1 != 'patch' ]] ; then
    echo "Usage: $0 [minor | patch]"
    exit -1
fi

# version the code
cd api
version=$(npm version --no-git-tag-version $1)
cd ../ui
npm version --no-git-tag-version $version
cd ..
git tag $version
git commit -a -m "tag and bump version"

# push it to github to trigger container builds
git push origin master --tags