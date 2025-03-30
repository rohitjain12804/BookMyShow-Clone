import { message } from "antd";
import moment from "moment";
import React, { useEffect } from "react";
import { BookShowTickets, MakePayment } from "../../apicalls/bookings";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { GetShowById } from "../../apicalls/theatres";
import { HideLoading, ShowLoading } from "../../redux/loadersSlice";
import { loadStripe } from "@stripe/stripe-js";
import Button from "../../components/Button";
import "../../stylesheets/BookShow.css";

const stripePromise = loadStripe("pk_test_51R7VHuPB7HtSM9irEyz5AHLLCg4Y1JwkFn2x10eIrDSfJf79WCzPS1Uvb1Sm43s6kaXHxZcpCZ4FWkEVxvpQMVvf00i58paHSq");

function BookShow() {
  const { user } = useSelector((state) => state.users);
  const [show, setShow] = React.useState(null);
  const [selectedSeats, setSelectedSeats] = React.useState([]);
  const params = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const getData = async () => {
    try {
      dispatch(ShowLoading());
      const response = await GetShowById({ showId: params.id });
      if (response.success) {
        setShow(response.data);
      } else {
        message.error(response.message);
      }
      dispatch(HideLoading());
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  const toggleSeatSelection = (seatNumber) => {
    setSelectedSeats((prevSelectedSeats) =>
      prevSelectedSeats.includes(seatNumber)
        ? prevSelectedSeats.filter((seat) => seat !== seatNumber)
        : [...prevSelectedSeats, seatNumber]
    );
  };

  const getSeats = () => {
    const totalSeats = show.totalSeats;
    const seatsPerTier = Math.floor(totalSeats / 3);
    const remainder = totalSeats % 3;

    const tierSeats = [
      seatsPerTier,
      seatsPerTier + (remainder >= 1 ? 1 : 0),
      seatsPerTier + (remainder === 2 ? 1 : 0),
    ];

    const renderTier = (startSeat, numSeats, tierClass, tierName) => {
      const fullRows = Math.floor(numSeats / 12);
      const lastRowSeats = numSeats % 12;
      const rows = [];

      for (let i = 0; i < fullRows; i++) {
        rows.push({
          seats: 12,
          start: startSeat + (i * 12),
          centered: false,
        });
      }

      if (lastRowSeats > 0) {
        rows.push({
          seats: lastRowSeats,
          start: startSeat + (fullRows * 12),
          centered: true,
        });
      }

      return (
        <div className={`tier ${tierClass}`}>
          <h3>{tierName}</h3>
          <div className="seats-container">
            {rows.map((row, rowIndex) => (
              <div
                key={rowIndex}
                className={`seat-row ${row.centered ? "centered" : ""}`}
              >
                {Array.from({ length: row.seats }).map((_, index) => {
                  const seatNumber = row.start + index;
                  if (seatNumber > totalSeats) return null;
                  let seatClass = "seat available";
                  if (selectedSeats.includes(seatNumber)) seatClass = "seat selected";
                  if (show.bookedSeats.includes(seatNumber)) seatClass = "seat booked";

                  return (
                    <div
                      key={seatNumber}
                      className={seatClass}
                      onClick={() => {
                        if (!show.bookedSeats.includes(seatNumber)) {
                          toggleSeatSelection(seatNumber);
                        }
                      }}
                    >
                      {seatNumber}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      );
    };

    return (
      <div className="theater-layout">
        <div className="screen-container">
          <div className="screen-curved">SCREEN</div>
        </div>
        {renderTier(1, tierSeats[0], "economy-tier", "Economy Tier")}
        {renderTier(tierSeats[0] + 1, tierSeats[1], "middle-tier", "Middle Tier")}
        {renderTier(tierSeats[0] + tierSeats[1] + 1, tierSeats[2], "premium-tier", "Premium Tier")}
      </div>
    );
  };

  const handlePayment = async () => {
    try {
      dispatch(ShowLoading());
      const response = await MakePayment({
        amount: selectedSeats.length * show.ticketPrice * 100, // Amount in paise
        seats: selectedSeats,
        showId: params.id,
      });
      dispatch(HideLoading());

      if (response.success) {
        const stripe = await stripePromise;
        const { sessionId } = response.data;
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          message.error(error.message);
        }
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    getData();
  }, [params.id]); // Re-run getData when showId changes

  return (
    show && (
      <div className="bookshow-container">
        <div className="show-info card">
          <div>
            <h1 className="text-sm">{show.theatre.name}</h1>
            <h1 className="text-sm">{show.theatre.address}</h1>
          </div>
          <div>
            <h1 className="text-2xl uppercase">
              {show.movie.title} ({show.movie.language})
            </h1>
          </div>
          <div>
            <h1 className="text-sm">
              {moment(show.date).format("MMM Do YYYY")} -{" "}
              {moment(show.time, "HH:mm").format("hh:mm A")}
            </h1>
          </div>
        </div>

        <div className="seats-section">
          {getSeats()}

          <div className="seat-legend">
            <div className="legend-item">
              <div className="seat available"></div>
              <span>Available</span>
            </div>
            <div className="legend-item">
              <div className="seat selected"></div>
              <span>Selected</span>
            </div>
            <div className="legend-item">
              <div className="seat booked"></div>
              <span>Booked</span>
            </div>
          </div>
        </div>

        {selectedSeats.length > 0 && (
          <div className="booking-section">
            <div className="selected-info">
              <h1>
                <b>Selected Seats:</b> {selectedSeats.join(", ")}
              </h1>
              <h1>
                <b>Total Price:</b> ₹{selectedSeats.length * show.ticketPrice}
              </h1>
            </div>

            <Button title="Book Now" onClick={handlePayment} />
          </div>
        )}
      </div>
    )
  );
}

export default BookShow;