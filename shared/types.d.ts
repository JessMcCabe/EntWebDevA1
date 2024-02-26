export type MovieReview =   {
  movieId: number,
  review: Review[]
  

  
}

type Review = {
  reviewDate: string,
  reviewBody: ReviewBody
}

  type ReviewBody = {  
  reviewerName: string,
  content: string,
  rating: 1 | 2 | 3| 4| 5
}
