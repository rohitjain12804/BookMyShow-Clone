import React, { useEffect } from "react";
import { Form, message } from "antd";
import Button from "../../components/Button";
import { Link, useNavigate } from "react-router-dom";
import { LoginUser } from "../../apicalls/users";
import { useDispatch } from "react-redux";
import { HideLoading, ShowLoading } from "../../redux/loadersSlice";

function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const onFinish = async (values) => {
    try {
      dispatch(ShowLoading());
      const response = await LoginUser(values);
      dispatch(HideLoading());
      if (response.success) {
        message.success(response.message);
        localStorage.setItem("token", response.data);
        window.location.href = "/";
      } else {
        message.error(response.message);
      }
    } catch (error) {
      dispatch(HideLoading());
      message.error(error.message);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/");
    }
  }, []);
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-primary">
      {/* Main Image above the login box */}
      <img 
        src="/icon.jpg" 
        alt="Logo" 
        style={{ 
          width: "400px", // Matches login box width
          height: "auto", // Maintains aspect ratio
          marginBottom: "20px", // Space between image and form
          borderRadius: "8px" // Optional rounded corners
        }} 
      />
  
      <div className="card p-3 w-400">
        {/* Ensuring text and image are aligned properly */}
        <h1 className="text-xl mb-1 flex items-center justify-center gap-3 whitespace-nowrap">
          SHOWTIME EXPRESS - LOGIN
          {/* Small Image next to the text */}
          <img 
            src="/icon1.jpg" 
            alt="Login Icon" 
            style={{ 
              width: "50px",  // Increased size for visibility
              height: "50px", 
              objectFit: "contain" // Maintain aspect ratio
            }} 
          />
        </h1>
        <hr />
        <Form layout="vertical" className="mt-1" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: "Please input your email!" }]}
          >
            <input type="email" />
          </Form.Item>
          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please input your password!" }]}
          >
            <input type="password" />
          </Form.Item>
  
          <div className="flex flex-col mt-2 gap-1">
            <Button fullWidth title="LOGIN" type="submit" />
            <Link to="/register" className="text-primary">
              {" "}
              Don't have an account? Register
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
    
  
}

export default Register;
