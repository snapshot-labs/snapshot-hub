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

query Spaces {
  spaces(first: 10) {
    id
    name
    about
    private
    members
    strategies {
      name
      params
    }
  }
}`
