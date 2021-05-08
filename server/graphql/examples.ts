export default `
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
      members
    }
  }
}

query Proposal {
  proposal(
    id: "QmbVAj4AKrPfWxPrJY8KtN7RNE4gEkzmMW7zvu8iZcdZC9"
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
      members
    }
  }
}
`;
