Kustomoitu AWS cdk bootstrap-template localstackia varten, koska vakioversio käyttää maksullisia localstack pro-ominaisuuksia.

Template on tuotettu seuraavalla tavalla:

1. npm run cdk --silent -- bootstrap --show-template >localstack-bootstrap.yml
2. poista ContainerAssetsRepository ja viittaukset siihen
