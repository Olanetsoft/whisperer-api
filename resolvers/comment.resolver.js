const knex = require('../db');
const { authError } = require('../utils/errors');
const { COMMENT_TABLE_NAME, WHISPER_COMMENT_ADDED } = require('../utils/constants');
const { checkLimitPageExist } = require('../utils/pagination');
const pubsub = require('../utils/pubsub');


exports.commentQueries = {
  fetchWhisperComments: async (_, args, context) => {
    if (!context.user) return authError();
    checkLimitPageExist(args);
    console.log(args)

    const { whisperId } = args;

    return knex(COMMENT_TABLE_NAME)
      .select()
      .where('whisper', whisperId)
      .orderBy('createdat', 'desc');
  }
};

exports.commentMutations = {
  createComment: async (_, args, context) => {
    if (!context.user) return authError();

    const userId = context.user.id;
    const dbPayload = { ...args.payload, commenter: userId };
    const [commentId] = await knex(COMMENT_TABLE_NAME)
      .insert(dbPayload);

    const response = {
      id: commentId,
      comment: args.payload.comment,
      commenter: context.user.id,
      whisper: args.payload.whisper
    }

    pubsub.publish(WHISPER_COMMENT_ADDED, response);

    return { ...args.payload, id: commentId, commenter: userId };
  }
};

exports.commentSubscriptions = {
  commentAdded: {
    resolve: payload => payload,
    subscribe: () => pubsub.asyncIterator(WHISPER_COMMENT_ADDED),
  }
}
