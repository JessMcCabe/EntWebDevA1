export type MovieReview =   {
  movieId: number,
  reviewDate: string,
  reviewerName: string,
  content: string,
  rating: 1 | 2 | 3| 4| 5
  

  
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

export type ReviewsByMovieIdQueryParams = {
  movieId: string
}

export type ReviewsByMinRatingQueryParams = {
  rating: string
}

export type SignUpBody = {
  username: string;
  password: string;
  email: string
}

export type ConfirmSignUpBody = {
  username: string;
  code: string;
}

export type SignInBody = {
  username: string;
  password: string;
}

export type UserPool = {
  userPoolId: string;
  clientId: string;
}