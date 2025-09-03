import styled from 'styled-components'

export const GameWrapper = styled.div`
    width: 100%;
    height: 100%;

    .control{
        width:100%;
        height:100%
    }

   .container{
    position: absolute;
    left:50%;
    transform:translate(-50%);
    bottom:100px;
    background-color:#ccc3;
    border-radius: 30px;
    display: flex;
    align-items: center;
   }

   .color-item::after{
    content: "";
    display: block;
    position:relative;
    left:50%;
    top:50%;  
    transform:translate(-50%,-50%);  
    width:38px;
    height:38px;
    border-radius:50%;
    border:2px solid #fff;
   }

   .info {
    position: absolute;
    bottom: 10px;
    right: 10px;
    color: #ffffffff;
    width:fit-content;
    height:30px;
    line-height:30px;
    padding:10px;
    backdrop-filter: blur(10px);
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    font-size: 16px;
    font-weight: bold;
    a {
      color: #fff;
    }
  }
`
