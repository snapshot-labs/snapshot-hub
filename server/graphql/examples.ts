export default `query Timeline {
  timeline(first: 10, spaces: ["balancer", "yam.eth"]) {
    id
    name
    start
    end
    state
    author {
      address
      name
      ens
    }
    space {
      id
      name
      members
    }
  }
}`;
