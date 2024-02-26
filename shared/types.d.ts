export type MovieReview =   {
  movieId: number,
  review: Review[]
  

  
}

type Review = {
  reviewerName: string,
  reviewDate: string,
  content: string,
  rating: 1 | 2 | 3| 4| 5
}