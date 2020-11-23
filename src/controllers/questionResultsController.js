const boom = require('boom')
const mongoose = require('mongoose')
const QuestionResults = require('../models/QuestionResults')
const FuzzyController = require('../controllers/fuzzyController')
const TestModel = require('../models/Test')
const TestResultModel = require('../models/TestResults')
const Question = require('../models/Question')

// Get all questionResults
exports.getAllQuestionResults = async (req, reply) => {
    try {
        const questionResults = await QuestionResults.find({})
        return questionResults
    } catch (err) {
        throw boom.boomify(err)
    }
}

// Get single questionResult by ID
exports.getQuestionResultsById = async (req, reply) => {
    try {
        const id = req.params.id
        const questionResult = await QuestionResults.findById(id)
        return questionResult
    } catch (err) {
        throw boom.boomify(err)
    }
}

// Add a new questionResult
exports.addQuestionResults = async (req, reply) => {
    try {
        const {user_id, theme_id, test_id, question, user_answers} = req.body
        let existQuestion = await QuestionResults.findOne({theme_id: theme_id, user_id:user_id, test_id: new mongoose.Types.ObjectId(test_id), '_id': new mongoose.Types.ObjectId(question)})
        let currentQuestionResult;
        if (existQuestion == null) {
            const questionResult = new QuestionResults(req.body)
            currentQuestionResult = await questionResult.save()
        } else {
            currentQuestionResult = await QuestionResults.findByIdAndUpdate(existQuestion._id, {user_answers}, {new: true})
        }

        let maxPointPerTest = await Promise.all(await getMaxPointPerTest(test_id, theme_id))

        maxPointPerTest = maxPointPerTest[0]

        const currentQuestion = await Question.findById(question)

        const currentTestResult = await TestResultModel.findOne({test_id, user_id})

        let allUserQuestionResults = await QuestionResults.find({test_id, user_id})
        allUserQuestionResults = allUserQuestionResults.map(s => s.question)
        let allQuestionsPerTest = await TestModel.findOne({theme_id, _id: test_id})
        const currentTest = await TestModel.findOne({theme_id, _id: test_id})

        let pointPerResult
        if(currentQuestionResult == null)
            pointPerResult = 0
        else pointPerResult = currentQuestionResult.points

        let maxPointPerQuestion
        if (currentQuestion == null)
            maxPointPerQuestion = 1
        else maxPointPerQuestion = currentQuestion.points

        let currentTestPoints
        if (currentTestResult == null)
            currentTestPoints = 0
        else currentTestPoints = currentTestResult.points

        if(maxPointPerTest === 0 && currentTestPoints === 0)
            maxPointPerTest = 1

        let nextQuestion = "-1";

        if(currentTest.medium_questions.length === allUserQuestionResults.length){
            nextQuestion = {}
            return reply.code(200).send(nextQuestion)
        }

        const fuzzyResult = FuzzyController.getNextQuestionLevel(pointPerResult / maxPointPerQuestion, currentTestPoints / maxPointPerTest)
        switch (fuzzyResult) {
            case  -1:
                allQuestionsPerTest = await Promise.all(allQuestionsPerTest.easy_questions.filter(async (s) => {
                    const question = await Question.findById(s)
                    return question.difficulty === 1 && allUserQuestionResults.includes(s) === false
                }))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = await Question.findById(allQuestionsPerTest[0])

                    if (nextQuestion != null) {
                        nextQuestion.right_answers = undefined
                        console.log(nextQuestion.answers)

                        return nextQuestion
                    }
                }
            case 0:
                allQuestionsPerTest = await Promise.all(allQuestionsPerTest.medium_questions.filter(async (s) => {
                    const question = await Question.findById(s)
                    return question.difficulty === 2 && allUserQuestionResults.includes(s) === false
                }))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = await Question.findById(allQuestionsPerTest[0])

                    if (nextQuestion != null) {
                        nextQuestion.right_answers = undefined
                        return nextQuestion
                    }
                }
            case 1:
                allQuestionsPerTest = await Promise.all(allQuestionsPerTest.difficult_questions.filter(async (s) => {
                    const question = await Question.findById(s)
                    return question.difficulty === 3 && allUserQuestionResults.includes(s) === false
                }))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = await Question.findById(allQuestionsPerTest[0])

                    if (nextQuestion != null) {
                        nextQuestion.right_answers = undefined
                        return nextQuestion
                    }
                }

        }

        if (nextQuestion === "-1")
            nextQuestion = {}

        return reply.code(200).send(nextQuestion)

    } catch (err) {
        throw boom.boomify(err)
    }
}

// Update an existing questionResult
exports.updateQuestionResults = async (req, reply) => {
    try {
        const id = req.params.id
        const questionResult = req.body
        const { ...updateData } = questionResult
        const currentQuestionResult = await QuestionResults.findByIdAndUpdate(id, updateData, { new: true })

        const {user_id, theme_id, test_id, question} = req.body

        let maxPointPerTest = await Promise.all(await getMaxPointPerTest(test_id, theme_id))

        maxPointPerTest = maxPointPerTest[0]

        const currentQuestion = await Question.findById(question)

        const currentTestResult = await TestResultModel.findOne({test_id, user_id})

        let allUserQuestionResults = await QuestionResults.find({test_id, user_id})
        allUserQuestionResults = allUserQuestionResults.map(s => s.question)
        let allQuestionsPerTest = await TestModel.findOne({theme_id, _id: test_id})
        const currentTest = await TestModel.findOne({theme_id, _id: test_id})

        let pointPerResult
        if(currentQuestionResult == null)
            pointPerResult = 0
        else pointPerResult = currentQuestionResult.points

        let maxPointPerQuestion
        if (currentQuestion == null)
            maxPointPerQuestion = 1
        else maxPointPerQuestion = currentQuestion.points

        let currentTestPoints
        if (currentTestResult == null)
            currentTestPoints = 0
        else currentTestPoints = currentTestResult.points

        if(maxPointPerTest === 0 && currentTestPoints === 0)
            maxPointPerTest = 1

        let nextQuestion = "-1";

        if(currentTest.medium_questions.length === allUserQuestionResults.length){
            nextQuestion = {}
            return reply.code(200).send(nextQuestion)
        }

        const fuzzyResult = FuzzyController.getNextQuestionLevel(pointPerResult / maxPointPerQuestion, currentTestPoints / maxPointPerTest)
        switch (fuzzyResult) {
            case  -1:
                allQuestionsPerTest = await Promise.all(allQuestionsPerTest.easy_questions.filter(async (s) => {
                    const question = await Question.findById(s)

                    return question.difficulty === 1 && allUserQuestionResults.includes(s) === false
                }))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = await Question.findById(allQuestionsPerTest[0])

                    if (nextQuestion != null) {
                        nextQuestion.right_answers = undefined
                        return nextQuestion
                    }
                }
            case 0:
                allQuestionsPerTest = await Promise.all(allQuestionsPerTest.medium_questions.filter(async (s) => {
                    const question = await Question.findById(s)
                    return question.difficulty === 2 && allUserQuestionResults.includes(s) === false
                }))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = await Question.findById(allQuestionsPerTest[0])

                    if (nextQuestion != null) {
                        nextQuestion.right_answers = undefined
                        return nextQuestion
                    }
                }
            case 1:
                allQuestionsPerTest = await Promise.all(allQuestionsPerTest.difficult_questions.filter(async (s) => {
                    const question = await Question.findById(s)
                    return question.difficulty === 3 && allUserQuestionResults.includes(s) === false
                }))
                if (allQuestionsPerTest.length > 0) {
                    nextQuestion = await Question.findById(allQuestionsPerTest[0])

                    if (nextQuestion != null) {
                        nextQuestion.right_answers = undefined
                        return nextQuestion
                    }
                }
        }

        if (nextQuestion === "-1")
            nextQuestion = {}
        return reply.code(200).send(nextQuestion)
    } catch (err) {
        throw boom.boomify(err)
    }
}

// Delete a questionResult
exports.deleteQuestionResults = async (req, reply) => {
    try {
        const id = req.params.id
        const questionResult = await QuestionResults.findByIdAndRemove(id)
        return questionResult
    } catch (err) {
        throw boom.boomify(err)
    }
}

getMaxPointPerTest = async (_id, _theme_id) => {

    let tests = await TestModel.findOne({theme_id: _theme_id, '_id':_id})
    tests.easy_questions = await Promise.all(tests.easy_questions.map(async (q) => {
        const que = await Question.findById(q._id)

        if (que != null) {
            que.right_answers = undefined
            return que
        }
    }))
    tests.medium_questions = await Promise.all(tests.medium_questions.map(async (q) => {
        const que = await Question.findById(q._id)

        if (que != null) {
            que.right_answers = undefined
            return que
        }
    }))
    tests.difficult_questions = await Promise.all(tests.difficult_questions.map(async (q) => {
        const que = await Question.findById(q._id)

        if (que != null) {
            que.right_answers = undefined
            return que
        }
    }))

    return [Math.max(tests.difficult_questions.length, tests.medium_questions.length, tests.easy_questions.length)]
}
