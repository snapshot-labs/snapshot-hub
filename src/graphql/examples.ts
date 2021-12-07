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
    admins
    members
    filters {
      minScore
      onlyMembers
    }
    plugins
    created:created_at
    updated:updated_at
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
      created:created_at
      updated:updated_at
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
    choice
    space {
      id
      created:created_at
      updated:updated_at
    }
  }
}

query Follows {
  follows (where: { follower: "0xeF8305E140ac520225DAf050e2f71d5fBcC543e7" }) {
    id
    follower
    space {
      id
      created:created_at
      updated:updated_at
    }
    created
  }
}
`;
