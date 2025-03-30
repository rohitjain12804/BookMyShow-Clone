const router = require("express").Router();
const stripe = require("stripe")(process.env.stripe_key);
const authMiddleware = require("../middlewares/authMiddleware");
const Booking = require("../models/bookingModel");
const Show = require("../models/showModel");

// Make payment
router.post("/make-payment", authMiddleware, async (req, res) => {
  try {
    const { amount, seats, showId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: `Tickets for Show ${showId}` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `http://localhost:3000/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:3000/book-show/${showId}`,
      metadata: { seats: JSON.stringify(seats), showId, userId: req.body.userId },
    });

    res.send({
      success: true,
      message: "Payment session created",
      data: { sessionId: session.id },
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// Book shows
router.post("/book-show", authMiddleware, async (req, res) => {
  try {
    const newBooking = new Booking(req.body);
    await newBooking.save();

    const show = await Show.findById(req.body.show);
    await Show.findByIdAndUpdate(req.body.show, {
      $push: { bookedSeats: { $each: req.body.seats } },
    });

    res.send({
      success: true,
      message: "Show booked successfully",
      data: newBooking,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// Get all bookings by user
router.get("/get-bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.body.userId })
      .populate("show")
      .populate({
        path: "show",
        populate: {
          path: "movie",
          model: "movies",
        },
      })
      .populate("user")
      .populate({
        path: "show",
        populate: {
          path: "theatre",
          model: "theatres",
        },
      });

    res.send({
      success: true,
      message: "Bookings fetched successfully",
      data: bookings,
    });
  } catch (error) {
    res.send({
      success: false,
      message: error.message,
    });
  }
});

// Verify payment and save booking
router.post("/verify-payment", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).send({
        success: false,
        message: "Session ID is required",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return res.status(404).send({
        success: false,
        message: "Payment session not found",
      });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).send({
        success: false,
        message: "Payment not completed",
      });
    }

    const { seats, showId, userId } = session.metadata;
    if (!seats || !showId || !userId) {
      return res.status(400).send({
        success: false,
        message: "Missing required booking information",
      });
    }

    const parsedSeats = JSON.parse(seats);
    const transactionId = session.payment_intent;

    // Check if show exists and seats are still available
    const show = await Show.findById(showId);
    if (!show) {
      return res.status(404).send({
        success: false,
        message: "Show not found",
      });
    }

    // Check if any of the seats are already booked
    const alreadyBookedSeats = parsedSeats.filter(seat => 
      show.bookedSeats.includes(seat)
    );

    if (alreadyBookedSeats.length > 0) {
      return res.status(400).send({
        success: false,
        message: "Some seats are already booked",
        data: alreadyBookedSeats,
      });
    }

    // Save booking to MongoDB
    const newBooking = new Booking({
      show: showId,
      user: userId,
      seats: parsedSeats,
      transactionId,
    });
    
    await newBooking.save();

    // Update show with booked seats
    await Show.findByIdAndUpdate(showId, {
      $push: { bookedSeats: { $each: parsedSeats } },
    });

    res.send({
      success: true,
      message: "Booking saved successfully",
      data: newBooking,
    });
  } catch (error) {
    console.error("Error in verify-payment:", error);
    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;