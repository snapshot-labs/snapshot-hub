export default `
query Spaces {
  spaces(
    first: 20,
    skip: 0,
    orderBy: "created",
    orderDirection: desc
  ) {
    id
    name
    about
    network
    symbol
    strategies {
      name
      params
    }
    admin
    members
    filters {
      minScore
      onlyMembers
    }
    plugins
  }
}

query Proposals {
  proposals(
    first: 20,
    skip: 0,
    where: {
      space_in: ["balancer", "yam.eth"],
      state: "closed"
    },
    orderBy: "created",
    orderDirection: desc
  ) {
    id
    title
    body
    choices
    start
    end
    snapshot
    state
    author
    space {
      id
      name
    }
  }
}

query Votes {
  votes (
    first: 1000
    where: {
      proposal: "QmPvbwguLfcVryzBRrbY4Pb9bCtxURagdv1XjhtFLf3wHj"
    }
  ) {
    id
    voter
    created
    proposal
    choice
    space {
      id
    }
  }
}
`;
