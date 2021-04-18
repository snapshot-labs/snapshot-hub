const timelineQuery = `query Timeline {
  timeline(first: 5, spaces: ["balancer", "yam.eth"]) {
    id
    author
    timestamp
    start
    end
    state
    space {
      id
      name
      members
    }
  }
}`


export default timelineQuery