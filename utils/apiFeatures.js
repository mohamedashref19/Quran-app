class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    //1.1)Filtring
    //const queryObj = { ...req.query };
    // const query = Tour.find()
    //   .where('duration')
    //   .equals(5)
    //   .where('difficulty')
    //   .equals('easy');
    //1.2)Advanced filter
    //const queryObj = req.query;
    //const execuldefields = ['page', 'limit', 'sort', 'fields'];
    // execuldefields.forEach(el => delete queryObj[el]);
    const { page, limit, sort, fields, ...queryObj } = this.queryString;
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(lte?|gte?)\b/g, match => `$${match}`);
    // eslint-disable-next-line no-undef
    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      // console.log(sortBy);
      this.query = this.query.sort(sortBy);
      //query = query.sort(req.query.sort); //if use + in url
    } else {
      this.query = this.query.sort('createAt _id'); //defualt
    }
    return this;
  }

  limitfields() {
    if (this.queryString.fields) {
      const field = this.queryString.fields.split(',').join(' ');
      this.query.select(field);
      //query.select(fields); //use + in url
    } else {
      this.query.select('-__v'); //defualt
    }
    return this;
  }

  Pagination() {
    const page1 = this.queryString.page * 1 || 1;
    const limit1 = this.queryString.limit * 1 || 100;
    const skip = (page1 - 1) * limit1;
    this.query = this.query.skip(skip).limit(limit1);
    // if (this.queryString.page) {
    //   const numtour = await Tour.countDocuments(JSON.parse(queryStr));
    //   if (skip >= numtour) throw new Error('page not exsist');
    // }
    return this;
  }
}
module.exports = APIFeatures;
