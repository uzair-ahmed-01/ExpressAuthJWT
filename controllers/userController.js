import UserModel from "../models/User.js";
import dotenv from 'dotenv'
dotenv.config()
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import transporter from "../config/emailConfig.js";

class UserController {
    static userRegistration = async (req, res) => {
        const { name, email, password, password_confirmation, tc } = req.body;
        const user = await UserModel.findOne({ email: email });
        if (user) {
            res.send({ status: "failed", message: "Email already exists" });
        } else {
            if (name && email && password && password_confirmation && tc) {
                if (password === password_confirmation) {
                    try {
                        const salt = await bcrypt.genSalt(10);
                        const hashPassword = await bcrypt.hash(password, salt);
                        const newRegistration = new UserModel({
                            name: name,
                            email: email,
                            password: hashPassword,
                            tc: tc,
                        });

                        await newRegistration.save();
                        const saved_user = await UserModel.findOne({ email: email })
                        // Generate JWT Token
                        const token = jwt.sign({ UserID: saved_user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '5d' })
                        res.status(200).json({ status: "success", message: "Registration Success", token: token })
                    } catch (error) {
                        console.log(error);
                        res.send({ status: "failed", message: "Unable to Register" });
                    }
                } else {
                    res.send({
                        status: "failed",
                        message: "Password and Confirm Password doesn't match",
                    });
                }
            } else {
                res.send({ status: "failed", message: "All fields are required" });
            }
        }
    }

    static userLogin = async (req, res) => {
        try {
            const { email, password } = req.body;
            if (email && password) {
                const user = await UserModel.findOne({ email: email });
                if (user != null) {
                    const isMatch = await bcrypt.compare(password, user.password)
                    if ((user.email === email) && isMatch) {
                        // Generate JWT Token
                        const token = jwt.sign({ UserID: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '15m' })
                        res.send({ "status": "success", "message": "Login Success", Token: token })
                    } else {
                        res.send({ "status": "failed", "message": "Email or Password is not Valid" })
                    }
                } else {
                    res.send({ "status": "failed", "message": "You are not a Registered User" })
                }
            } else {
                res.send({ status: "failed", message: "All fields are required" })
            }
        } catch (error) {
            console.log(error)
            res.send({ "status": "failed", "message": "Unable to Login" })
        }
    }

    static changeUserPassword = async (req, res) => {
        const { password, password_confirmation } = req.body
        if (password && password_confirmation) {
            if (password !== password_confirmation) {
                res.send({ "status": "failed", "message": "New Password and Confirm New Password doesn't match" })
            } else {
                const salt = await bcrypt.genSalt(10)
                const newHashPassword = await bcrypt.hash(password, salt)
                await UserModel.findByIdAndUpdate(req.user._id, { $set: { password: newHashPassword } })
                res.send({ "status": "success", "message": "Password changed succesfully" })
            }
        } else {
            res.send({ "status": "failed", "message": "All Fields are Required" })
        }
    }

    static loggedUser = async (req, res) => {
        res.send({ user: req.user })
    }

    static sendUserPasswordResetEmail = async (req, res) => {
        const { email } = req.body
        if (email) {
            const user = await UserModel.findOne({ email: email })

            if (user) {
                const secret = user._id + process.env.JWT_SECRET_KEY
                const token = jwt.sign({ UserID: user._id }, secret, { expiresIn: '15m' })
                const link = `http://localhost:3000/api/user/reset/${user._id}/${token}`
                // Send Email
                let info = await transporter.sendMail({
                    from: process.env.EMAIL_FROM,
                    to: user.email,
                    subject: "Password Reset Link",
                    html: `<a href=${link}>Click Here</a> to Reset Your Passowrd`
                })

                // const mailOptions = {
                //     from: process.env.EMAIL_FROM,
                //     to: user.email,
                //     subject: "Password Reset Link",
                //     html: `<a href=${link}>Click Here</a> to Reset Your Passowrd`
                // }

                // transport.sendMail(mailOptions, (error, info) => {
                //     if (error) {
                //         console.error(error);
                //     } else {
                //         console.log('Email sent: ' + info.response);
                //     }
                // });
                res.send({ status: "success", message: "Password Reset Email Sent... Please Check Your Email", info: info })

            } else {
                res.send({ status: "failed", message: "Email doesn't exists" })
            }
        } else {
            res.send({ status: "failed", message: "Email Field is Required" })
        }
    }

    static userPasswordReset = async (req, res) => {
        const { password, password_confirmation } = req.body
        const { id, token } = req.params
        console.log(req.params)
        const user = await UserModel.findById(id)
        const new_secret = user._id + process.env.JWT_SECRET_KEY
        console.log(new_secret)
        try {
            const a = jwt.verify(token, new_secret)
            console.log(a)
            if (password && password_confirmation) {
                if (password !== password_confirmation) {
                    res.send({ status: "failed", message: "New Password and Confirm New Password doesn't match" })
                } else {
                    const salt = await bcrypt.genSalt(10)
                    const newHashPassword = await bcrypt.hash(password, salt)
                    await UserModel.findByIdAndUpdate(user._id, { $set: { password: newHashPassword } })
                    res.send({ status: "success", message: "Password Reset Successfully" })
                }
            } else {
                res.send({ status: "failed", message: "All Fields are Required" })
            }
        } catch (error) {
            console.log(error)
            res.send({ status: "failed", message: "Invalid Token" })
        }
    }
}


export default UserController;