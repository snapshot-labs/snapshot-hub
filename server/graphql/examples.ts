export const timelineQuery = `query Timeline {
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
}`;

export const spacesQuery = `query Spaces {
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
