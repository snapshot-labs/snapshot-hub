export default `query Timeline {
  timeline(first: 20, skip: 0, spaces: ["balancer", "yam.eth"], state: "closed") {
    id
    name
    start
    end
    state
    author {
      address
    }
    space {
      id
      name
      members
    }
  }
}

query Votes{
  votes(first:10) {
    id
    choice
    space {
			id
      private
      about
    }
    proposalId
    voter{
      address
    }
  }
}
`;
