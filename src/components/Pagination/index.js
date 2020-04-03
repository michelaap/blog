import React from "react"
import PropTypes from "prop-types"
import AniLink from "gatsby-plugin-transition-link/AniLink"

import getThemeColor from "../../utils/getThemeColor"

import * as S from "./styled"

const Pagination = ({
  isFirst,
  isLast,
  currentPage,
  numPages,
  prevPage,
  nextPage,
}) => (
  <S.PaginationWrapper>
    {!isFirst && (
      <AniLink
        to={prevPage}
        cover
        direction="left"
        bg={getThemeColor()}
        duration={0.6}
      >
        Página anterior{" "}
        <span role="img" aria-label="arrow left">
          👈🏻
        </span>{" "}
      </AniLink>
    )}
    <p>
      {currentPage} de {numPages}
    </p>
    {!isLast && (
      <AniLink
        to={nextPage}
        cover
        direction="right"
        bg={getThemeColor()}
        duration={0.6}
      >
        {" "}
        <span role="img" aria-label="arrow right">
          👉🏻
        </span>{" "}
        Próxima página
      </AniLink>
    )}
  </S.PaginationWrapper>
)

Pagination.propTypes = {
  isFirst: PropTypes.bool.isRequired,
  isLast: PropTypes.bool.isRequired,
  currentPage: PropTypes.number.isRequired,
  numPages: PropTypes.number.isRequired,
  prevPage: PropTypes.string,
  nextPage: PropTypes.string,
}

export default Pagination
